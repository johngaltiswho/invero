import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { CreatePurchaseRequestPayload } from '@/types/purchase-requests';
import { sendEmail } from '@/lib/email';
import { purchaseRequestSubmittedEmail } from '@/lib/notifications/email-templates';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { createSignedUrlWithFallback } from '@/lib/storage-url';
import { calculateCapitalAccrualMetrics, groupTransactionsByPurchaseRequest } from '@/lib/capital-accrual';

async function resolveShippingLocation(
  supabase: any,
  projectId: string,
  explicitShippingLocation?: string | null
) {
  const trimmedExplicit = explicitShippingLocation?.trim();
  if (trimmedExplicit) return trimmedExplicit;

  const { data: project } = await supabase
    .from('projects')
    .select('id, contractor_id, project_address, location, client_id, client_name')
    .eq('id', projectId)
    .maybeSingle() as { data: any };

  if (!project) return null;

  const projectShipping = project.project_address?.trim();
  if (projectShipping) return projectShipping;

  if (project.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('address')
      .eq('id', project.client_id)
      .maybeSingle() as { data: any };
    const clientAddress = client?.address?.trim();
    if (clientAddress) return clientAddress;
  }

  if (project.client_name) {
    const { data: clientByName } = await supabase
      .from('clients')
      .select('address')
      .eq('contractor_id', project.contractor_id)
      .ilike('name', project.client_name)
      .maybeSingle() as { data: any };
    const clientAddress = clientByName?.address?.trim();
    if (clientAddress) return clientAddress;
  }

  return project.location?.trim() || null;
}

async function resolveProjectPOReferenceForRequest(
  supabase: any,
  projectId: string,
  projectStatus: string | null | undefined,
  requestedPOReferenceId?: string | null
) {
  const normalizedStatus = String(projectStatus || '').toLowerCase();
  const requiresPO = ['awarded', 'finalized', 'completed'].includes(normalizedStatus);
  if (!requiresPO) return null;

  const { data: poReferences, error } = await supabase
    .from('project_po_references')
    .select('id, status, is_default')
    .eq('project_id', projectId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch project POs: ${error.message}`);
  }

  const activePOs = (poReferences || []).filter((po: any) => po.status === 'active');
  if (activePOs.length === 0) {
    throw new Error('No active client PO is available for this awarded project');
  }

  if (requestedPOReferenceId) {
    const requested = (poReferences || []).find((po: any) => po.id === requestedPOReferenceId);
    if (!requested) {
      throw new Error('Selected client PO does not belong to this project');
    }
    if (requested.status !== 'active') {
      throw new Error('Selected client PO is not active');
    }
    return requested.id;
  }

  if (activePOs.length === 1) {
    return activePOs[0].id;
  }

  return (activePOs.find((po: any) => po.is_default) || activePOs[0]).id;
}

// GET - Fetch purchase requests for contractor
export async function GET(request: NextRequest) {
  // Apply rate limiting for read operations
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ_ONLY);
  if (rateLimitResult) return rateLimitResult;

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, company_name, contact_person, email, platform_fee_rate, platform_fee_cap, participation_fee_rate_daily')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Build query for normalized purchase requests
    let query = supabase
      .from('purchase_requests')
      .select(`
        id,
        project_id,
        project_po_reference_id,
        contractor_id,
        shipping_location,
        status,
        created_by,
        remarks,
        created_at,
        updated_at,
        submitted_at,
        approved_at,
        funded_at,
        delivery_status,
        dispatched_at,
        dispute_deadline,
        dispute_raised_at,
        dispute_reason,
        delivered_at,
        backfill_recorded_at,
        backfill_recorded_by,
        backfill_reason,
        invoice_generated_at,
        invoice_url,
        approved_by,
        approval_notes,
        project_po_references:project_po_reference_id (
          id,
          po_number,
          po_type,
          status,
          is_default
        ),
        contractors:contractor_id (
          id,
          company_name,
          contact_person,
          email
        )
      `)
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: purchaseRequests, error } = await query;

    if (error) {
      console.error('Failed to fetch purchase requests:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch purchase requests',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    const requestIds = (purchaseRequests || []).map((row: any) => row.id);
    const transactionsByRequest = new Map<string, Array<{ purchase_request_id: string; amount: number; transaction_type: string; created_at?: string | null }>>();
    const latestRepaymentSubmissionByRequest = new Map<string, string>();

    if (requestIds.length > 0) {
      const [{ data: fundingRows, error: fundingError }, { data: repaymentRows, error: repaymentError }] = await Promise.all([
        supabase
          .from('capital_transactions')
          .select('purchase_request_id, amount, transaction_type, created_at')
          .in('purchase_request_id', requestIds)
          .in('transaction_type', ['deployment', 'return'])
          .eq('status', 'completed'),
        supabase
          .from('contractor_repayment_submissions')
          .select('purchase_request_id, status, created_at')
          .in('purchase_request_id', requestIds)
          .order('created_at', { ascending: false })
      ]);

      if (fundingError) {
        console.error('Failed to load capital transactions for contractor purchase requests:', fundingError);
      } else {
        const grouped = groupTransactionsByPurchaseRequest(
          fundingRows as Array<{ purchase_request_id: string; amount: number; transaction_type: string; created_at?: string | null }>
        );
        grouped.forEach((rows, requestId) => {
          transactionsByRequest.set(requestId, rows);
        });
      }

      if (repaymentError) {
        console.error('Failed to load contractor repayment submissions for contractor purchase requests:', repaymentError);
      } else {
        (repaymentRows || []).forEach((row: { purchase_request_id: string; status: string }) => {
          if (row.purchase_request_id && !latestRepaymentSubmissionByRequest.has(row.purchase_request_id)) {
            latestRepaymentSubmissionByRequest.set(row.purchase_request_id, row.status);
          }
        });
      }
    }

    const invoiceBucket = process.env.INVOICE_STORAGE_BUCKET || 'contractor-documents';
    const enriched = await Promise.all(
      (purchaseRequests || []).map(async (requestRow: any) => {
        const fallbackPath = `${contractor.id}/invoices/${requestRow.id}.pdf`;
        const signedUrl = await createSignedUrlWithFallback(supabase, {
          sourceUrl: requestRow.invoice_url,
          defaultBucket: invoiceBucket,
          fallbackPath
        });

        const metrics = calculateCapitalAccrualMetrics({
          transactions: transactionsByRequest.get(requestRow.id) || [],
          terms: {
            platform_fee_rate: contractor.platform_fee_rate,
            platform_fee_cap: contractor.platform_fee_cap,
            participation_fee_rate_daily: contractor.participation_fee_rate_daily
          },
          purchaseRequestTotal: 0
        });

        return {
          ...requestRow,
          invoice_download_url: signedUrl || requestRow.invoice_url || null,
          funded_amount: metrics.fundedAmount,
          returned_amount: metrics.returnedAmount,
          remaining_due: metrics.remainingDue,
          latest_repayment_submission_status: latestRepaymentSubmissionByRequest.get(requestRow.id) || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enriched
    });

  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchase requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new purchase request
export async function POST(request: NextRequest) {
  // Apply rate limiting for mutation operations
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MUTATION);
  if (rateLimitResult) return rateLimitResult;

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body: CreatePurchaseRequestPayload = await request.json();
    const { project_id, contractor_id, project_po_reference_id, remarks, items, shipping_location } = body;

    if (!project_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, items' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, email, contact_person, company_name')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Verify contractor matches request (if contractor_id is provided)
    if (contractor_id && contractor.id !== contractor_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, project_status')
      .eq('id', project_id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const resolvedShippingLocation = await resolveShippingLocation(supabase, project_id, shipping_location || null);
    const resolvedPOReferenceId = await resolveProjectPOReferenceForRequest(
      supabase,
      project_id,
      (project as any).project_status,
      project_po_reference_id || null
    );

    console.log('🚀 Creating purchase request for contractor:', contractor.id);
    console.log('📄 Request details:', { project_id, items: items.length, remarks });

    // Create purchase request with normalized schema
    const now = new Date().toISOString();
    const { data: purchaseRequest, error: requestError } = await supabase
      .from('purchase_requests')
      .insert({
        project_id,
        project_po_reference_id: resolvedPOReferenceId,
        contractor_id: contractor.id,
        status: 'submitted',
        created_by: contractor.id,
        shipping_location: resolvedShippingLocation,
        remarks: remarks || null,
        created_at: now,
        updated_at: now,
        submitted_at: now
      })
      .select()
      .single();

    if (requestError) {
      console.error('❌ Failed to create purchase request:', requestError);
      return NextResponse.json({ 
        error: 'Failed to create purchase request',
        details: requestError.message 
      }, { status: 500 });
    }

    console.log('✅ Purchase request created:', purchaseRequest.id);

    // Create purchase request items with normalized schema
    const requestItems = items.map((item) => ({
      purchase_request_id: purchaseRequest.id,
      project_material_id: item.project_material_id,
      hsn_code: item.hsn_code?.trim() || null,
      item_description: item.item_description?.trim() || null,
      site_unit: item.site_unit?.trim() || null,
      purchase_unit: item.purchase_unit?.trim() || null,
      conversion_factor: item.conversion_factor || null,
      purchase_qty: item.purchase_qty || null,
      normalized_qty: item.normalized_qty || null,
      requested_qty: item.requested_qty,
      unit_rate: item.unit_rate || null,
      tax_percent: item.tax_percent || 0,
      round_off_amount: item.round_off_amount || 0,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    let createdItems: any[] | null = null;
    let itemsError: { message?: string } | null = null;

    const insertWithConversion = await supabase
      .from('purchase_request_items')
      .insert(requestItems)
      .select();
    createdItems = insertWithConversion.data;
    itemsError = insertWithConversion.error;

    if (itemsError && String(itemsError.message || '').includes('column')) {
      const legacyItems = items.map((item) => ({
        purchase_request_id: purchaseRequest.id,
        project_material_id: item.project_material_id,
        hsn_code: item.hsn_code?.trim() || null,
        item_description: item.item_description?.trim() || null,
        requested_qty: item.requested_qty,
        unit_rate: item.unit_rate || null,
        tax_percent: item.tax_percent || 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const legacyInsert = await supabase
        .from('purchase_request_items')
        .insert(legacyItems)
        .select();
      createdItems = legacyInsert.data;
      itemsError = legacyInsert.error;
    }

    if (itemsError) {
      console.error('❌ Failed to create purchase request items:', itemsError);
      // Rollback: delete the purchase request
      await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', purchaseRequest.id);
      
      return NextResponse.json({ 
        error: 'Failed to create purchase request items',
        details: itemsError.message 
      }, { status: 500 });
    }

    const persistedItems = createdItems || [];
    console.log('✅ Purchase request items created:', persistedItems.length);

    const { data: projectNameRow } = await supabase
      .from('projects')
      .select('project_name')
      .eq('id', project_id)
      .single();

    const estimatedTotal = persistedItems.reduce((sum, item) => {
      const billableQty = Number((item as any).purchase_qty ?? item.requested_qty) || 0;
      const rate = Number(item.unit_rate) || 0;
      const taxPercent = Number(item.tax_percent) || 0;
      const roundOffAmount = Number((item as any).round_off_amount) || 0;
      const subtotal = billableQty * rate;
      return sum + subtotal + (subtotal * taxPercent) / 100 + roundOffAmount;
    }, 0);

    if (contractor?.email) {
      try {
        await sendEmail({
          to: contractor.email,
          ...purchaseRequestSubmittedEmail({
            recipientName: contractor.contact_person || contractor.company_name || 'there',
            projectName: projectNameRow?.project_name || project_id,
            itemCount: persistedItems.length,
            estimatedValue: estimatedTotal,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send purchase request submission email:', emailError);
      }
    }

    // Return the full purchase request with items
    return NextResponse.json({
      success: true,
      data: {
        ...purchaseRequest,
        items: persistedItems,
        total_items: persistedItems.length,
        total_requested_qty: persistedItems.reduce((sum, item) => sum + (Number(item.requested_qty) || 0), 0)
      }
    });

  } catch (error) {
    console.error('💥 Error creating purchase request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create purchase request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Submit purchase request
export async function PUT(request: NextRequest) {
  // Apply rate limiting for mutation operations
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MUTATION);
  if (rateLimitResult) return rateLimitResult;

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json({ error: 'Purchase request ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { action, remarks } = body;

    if (action !== 'submit') {
      return NextResponse.json({ error: 'Only submit action is supported' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, email, contact_person, company_name')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Update purchase request to submitted status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(remarks && { remarks })
      })
      .eq('id', requestId)
      .eq('contractor_id', contractor.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to submit purchase request:', updateError);
      return NextResponse.json({ 
        error: 'Failed to submit purchase request',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Purchase request submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting purchase request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit purchase request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
