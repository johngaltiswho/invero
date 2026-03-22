/**
 * Cron route: Process pending fuel bill OCR extractions
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 * Schedule: Every 5 minutes (recommended)
 *
 * Example Vercel cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-fuel-ocr",
 *     "schedule": "every 5 minutes"
 *   }]
 * }
 *
 * Workflow:
 * 1. Find fuel_expenses with status 'submitted' or 'ocr_processing' (limit 10 per run)
 * 2. For each expense:
 *    - Update status to 'ocr_processing'
 *    - Extract data using Gemini OCR
 *    - If success: Update with extracted data, status → 'pending_review'
 *    - If failure: Status → 'ocr_failed' (admin must manually enter data)
 * 3. Process max 10 expenses per run to avoid API quota issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractFuelBillData } from '@/lib/ocr/fuel-bill-extractor';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();

    // Find pending fuel expenses to process (limit 10 per run)
    const { data: pendingExpenses, error: fetchError } = await supabaseAdmin
      .from('fuel_expenses')
      .select('id, bill_image_url, contractor_id, vehicle_id')
      .in('status', ['submitted', 'ocr_processing'])
      .limit(10);

    if (fetchError) {
      console.error('Cron: Failed to fetch pending expenses:', fetchError);
      return NextResponse.json(
        { error: 'Failed to query database' },
        { status: 500 }
      );
    }

    if (!pendingExpenses || pendingExpenses.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending fuel expenses found',
      });
    }

    console.log(`Cron: Processing ${pendingExpenses.length} fuel bill OCR requests`);

    const results: Array<{
      id: string;
      status: 'success' | 'error';
      error?: string;
    }> = [];

    // Process each expense
    for (const expense of pendingExpenses) {
      try {
        // Update status to 'ocr_processing'
        await supabaseAdmin
          .from('fuel_expenses')
          .update({ status: 'ocr_processing' })
          .eq('id', expense.id);

        // Get signed URL for the bill image
        const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
          .from('contractor-documents')
          .createSignedUrl(expense.bill_image_url, 3600); // 1 hour expiry

        if (urlError || !signedUrlData) {
          console.error(`Failed to get signed URL for expense ${expense.id}:`, urlError);

          // Mark as OCR failed
          await supabaseAdmin
            .from('fuel_expenses')
            .update({
              status: 'ocr_failed',
              admin_notes: 'Failed to access bill image for OCR processing',
            })
            .eq('id', expense.id);

          results.push({
            id: expense.id,
            status: 'error',
            error: 'Failed to access bill image',
          });
          continue;
        }

        // Extract fuel bill data using OCR
        const ocrResult = await extractFuelBillData(signedUrlData.signedUrl);

        if (!ocrResult.success) {
          const ocrError = 'error' in ocrResult ? ocrResult.error : 'Unknown OCR error';
          console.error(`OCR failed for expense ${expense.id}:`, ocrError);

          // Mark as OCR failed
          await supabaseAdmin
            .from('fuel_expenses')
            .update({
              status: 'ocr_failed',
              admin_notes: `OCR extraction failed: ${ocrError}`,
            })
            .eq('id', expense.id);

          results.push({
            id: expense.id,
            status: 'error',
            error: ocrError,
          });
          continue;
        }

        // OCR successful - update expense with extracted data
        const { bill_number, bill_date, pump_name, fuel_type, quantity_liters, rate_per_liter, total_amount } = ocrResult.data;

        const { error: updateError } = await supabaseAdmin
          .from('fuel_expenses')
          .update({
            bill_number,
            bill_date,
            pump_name,
            fuel_type,
            quantity_liters,
            rate_per_liter,
            total_amount,
            ocr_raw_response: ocrResult.raw_response,
            status: 'pending_review', // Ready for admin review
          })
          .eq('id', expense.id);

        if (updateError) {
          console.error(`Failed to update expense ${expense.id} with OCR data:`, updateError);
          results.push({
            id: expense.id,
            status: 'error',
            error: 'Failed to save extracted data',
          });
        } else {
          console.log(`Successfully processed OCR for expense ${expense.id}`);
          results.push({
            id: expense.id,
            status: 'success',
          });
        }
      } catch (err) {
        console.error(`Error processing expense ${expense.id}:`, err);

        // Mark as OCR failed
        await supabaseAdmin
          .from('fuel_expenses')
          .update({
            status: 'ocr_failed',
            admin_notes: `OCR processing error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          })
          .eq('id', expense.id);

        results.push({
          id: expense.id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const durationMs = Date.now() - startTime;

    console.log(
      `Cron fuel OCR: ${successCount} processed successfully, ${errorCount} errors, ${durationMs}ms`
    );

    return NextResponse.json({
      success: true,
      processed: pendingExpenses.length,
      extracted: successCount,
      errors: errorCount,
      duration_ms: durationMs,
      details: results,
    });
  } catch (err) {
    console.error('Cron process-fuel-ocr error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
