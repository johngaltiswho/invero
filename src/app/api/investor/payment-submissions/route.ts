import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  calculateTrancheAllocations,
  getAllocationIntentFundingSnapshot,
  getLenderAllocationIntentById,
  markAllocationIntentFundingSubmitted,
} from '@/lib/lender-allocation-intents';
import { getInvestorAuthErrorStatus, resolveActiveInvestor } from '@/lib/investor-auth';

const DOC_BUCKET = 'investor-documents';

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((bucket: { name: string }) => bucket.name === DOC_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(DOC_BUCKET, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
    });
  }
}

async function createProofSignedUrl(path: string | null) {
  if (!path) return null;

  const { data } = await supabaseAdmin.storage
    .from(DOC_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl || null;
}

export async function GET() {
  try {
    const { investor } = await resolveActiveInvestor('id, email, name, status');

    const { data, error } = await supabaseAdmin
      .from('investor_payment_submissions')
      .select('*')
      .eq('investor_id', investor.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load investor payment submissions:', error);
      return NextResponse.json({ error: 'Failed to load payment submissions' }, { status: 500 });
    }

    const submissions = await Promise.all(
      (data || []).map(async (row) => ({
        ...row,
        proof_signed_url: await createProofSignedUrl(row.proof_document_path),
      }))
    );

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('Error loading investor payment submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load payment submissions' },
      { status: getInvestorAuthErrorStatus(error) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { investor } = await resolveActiveInvestor('id, email, name, status');

    const contentType = request.headers.get('content-type') || '';

    let amount = 0;
    let paymentDate = '';
    let paymentMethod = 'bank_transfer';
    let paymentReference = '';
    let notes = '';
    let allocationIntentId = '';
    let proofDocumentPath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      await ensureBucket();
      const formData = await request.formData();
      amount = Number(formData.get('amount'));
      paymentDate = String(formData.get('payment_date') || '');
      paymentMethod = String(formData.get('payment_method') || 'bank_transfer');
      paymentReference = String(formData.get('payment_reference') || '');
      notes = String(formData.get('notes') || '');
      allocationIntentId = String(formData.get('allocation_intent_id') || '');

      const proofFile = formData.get('proof_file') as File | null;
      if (proofFile) {
        const sanitizedName = proofFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
        const fileName = `payment-proof__${Date.now()}__${sanitizedName}`;
        const filePath = `${investor.id}/${fileName}`;

        const buffer = Buffer.from(await proofFile.arrayBuffer());
        const { error: uploadError } = await supabaseAdmin.storage
          .from(DOC_BUCKET)
          .upload(filePath, buffer, {
            contentType: proofFile.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.error('Failed to upload payment proof:', uploadError);
          return NextResponse.json({ error: 'Failed to upload payment proof' }, { status: 500 });
        }

        proofDocumentPath = filePath;
      }
    } else {
      const body = await request.json();
      amount = Number(body.amount);
      paymentDate = String(body.payment_date || '');
      paymentMethod = String(body.payment_method || 'bank_transfer');
      paymentReference = String(body.payment_reference || '');
      notes = String(body.notes || '');
      allocationIntentId = String(body.allocation_intent_id || '');
    }

    if (!allocationIntentId) {
      return NextResponse.json({ error: 'Allocation intent is required' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be a positive number' }, { status: 400 });
    }

    if (!paymentDate) {
      return NextResponse.json({ error: 'Payment date is required' }, { status: 400 });
    }

    const allocationIntent = await getLenderAllocationIntentById(allocationIntentId);
    if (!allocationIntent || allocationIntent.investor_id !== investor.id) {
      return NextResponse.json({ error: 'Allocation intent not found' }, { status: 404 });
    }

    if (allocationIntent.status !== 'ready_for_funding') {
      return NextResponse.json(
        { error: 'This allocation is not ready for funding yet. Finish the required agreements first.' },
        { status: 400 }
      );
    }

    const fundingSnapshot = await getAllocationIntentFundingSnapshot(
      allocationIntent.id,
      Number(allocationIntent.total_amount || 0)
    );

    if (fundingSnapshot.remainingAmount <= 0.009) {
      return NextResponse.json({ error: 'This allocation has already been fully funded' }, { status: 400 });
    }

    if (amount - fundingSnapshot.remainingAmount > 0.01) {
      return NextResponse.json(
        { error: `Payment exceeds the remaining approved amount of ${fundingSnapshot.remainingAmount.toFixed(2)}` },
        { status: 400 }
      );
    }

    const allocationPayload = calculateTrancheAllocations({
      totalIntentAmount: Number(allocationIntent.total_amount || 0),
      trancheAmount: amount,
      targetAllocations: Array.isArray(allocationIntent.allocation_payload) ? allocationIntent.allocation_payload : [],
      alreadyAllocatedByModel: fundingSnapshot.allocatedByModel,
    });

    const { data, error } = await supabaseAdmin
      .from('investor_payment_submissions')
      .insert([
        {
          investor_id: investor.id,
          amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          notes: notes || null,
          allocation_intent_id: allocationIntent.id,
          allocation_payload: allocationPayload,
          proof_document_path: proofDocumentPath,
          status: 'pending',
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create investor payment submission:', error);
      return NextResponse.json({ error: 'Failed to submit payment confirmation' }, { status: 500 });
    }

    await markAllocationIntentFundingSubmitted(allocationIntent.id);

    return NextResponse.json({ success: true, submission: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating investor payment submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit payment confirmation' },
      { status: getInvestorAuthErrorStatus(error) }
    );
  }
}
