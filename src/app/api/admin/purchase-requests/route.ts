import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { purchaseRequestStatusEmail } from '@/lib/notifications/email-templates';
import { createSignedUrlWithFallback } from '@/lib/storage-url';
import { auditPurchaseRequest, auditVendorAssignment } from '@/lib/audit';
import { calculateCapitalAccrualMetrics, groupTransactionsByPurchaseRequest } from '@/lib/capital-accrual';
import { currentUser } from '@clerk/nextjs/server';
import { validateRequestBody, updatePurchaseRequestSchema } from '@/lib/validations';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

type PurchaseSummary = {
  draft: number;
  submitted: number;
  approved: number;
  funded: number;
  po_generated: number;
  completed: number;
  rejected: number;
};

type PurchaseRequestItemRow = {
  id: string;
  purchase_request_id: string;
  project_material_id: string;
  hsn_code?: string | null;
  item_description?: string | null;
  site_unit?: string | null;
  purchase_unit?: string | null;
  conversion_factor?: number | null;
  purchase_qty?: number | null;
  normalized_qty?: number | null;
  requested_qty: number;
  approved_qty?: number | null;
  unit_rate?: number | null;
  tax_percent?: number | null;
  status: string;
  project_materials?: {
    unit?: string | null;
    notes?: string | null;
    materials?: {
      name?: string | null;
      description?: string | null;
      hsn_code?: string | null;
    } | null;
  } | null;
};

type PurchaseRequestUpdate = {
  status?: string;
  approval_notes?: string | null;
  updated_at?: string;
  approved_at?: string | null;
  funded_at?: string | null;
};

type PurchaseRequestItemUpdate = {
  status?: string;
  approved_qty?: number | null;
  updated_at?: string;
};

const createEmptySummary = (): PurchaseSummary => ({
  draft: 0,
  submitted: 0,
  approved: 0,
  funded: 0,
  po_generated: 0,
  completed: 0,
  rejected: 0
});

interface FetchOptions {
  status?: string;
  limit?: number;
  offset?: number;
  ids?: string[];
}

async function fetchPurchaseSummary(): Promise<PurchaseSummary> {
  const summary = createEmptySummary();
  const { data, error } = await supabaseAdmin
    .from('purchase_requests')
    .select('status');

  if (error) {
    console.error('Failed to compute purchase summary:', error);
    return summary;
  }

  data?.forEach((row: { status: string | null }) => {
    if (!row.status) return;
    const key = row.status as keyof PurchaseSummary;
    if (key in summary) {
      summary[key] += 1;
    }
  });

  return summary;
}

async function fetchPurchaseRequests(options: FetchOptions = {}) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  let query = supabaseAdmin
    .from('purchase_requests')
    .select(
      `
        id,
        project_id,
        contractor_id,
        status,
        remarks,
        approval_notes,
        created_at,
        updated_at,
        submitted_at,
        approved_at,
        funded_at,
        vendor_id,
        vendor_assigned_at,
        delivery_status,
        dispatched_at,
        dispute_deadline,
        dispute_raised_at,
        dispute_reason,
        delivered_at,
        invoice_generated_at,
        contractors:contractor_id (
          id,
          company_name,
          contact_person,
          email,
          platform_fee_rate,
          platform_fee_cap,
          participation_fee_rate_daily
        )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (options.ids && options.ids.length > 0) {
    query = query.in('id', options.ids);
  } else {
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    query = query.range(offset, offset + limit - 1);
  }

  const { data: requestRows, error, count } = await query;

  if (error) {
    throw error;
  }

  const requestIds = requestRows?.map((row: { id: string }) => row.id) ?? [];
  const itemsByRequest = new Map<string, PurchaseRequestItemRow[]>();

  if (requestIds.length > 0) {
    let itemRows: PurchaseRequestItemRow[] | null = null;
    let itemsError: { message?: string } | null = null;

    const itemsWithConversion = await supabaseAdmin
      .from('purchase_request_items')
      .select(
        `
          id,
          purchase_request_id,
          project_material_id,
          hsn_code,
          item_description,
          site_unit,
          purchase_unit,
          conversion_factor,
          purchase_qty,
          normalized_qty,
          requested_qty,
          approved_qty,
          unit_rate,
          tax_percent,
          status,
          created_at,
          project_materials:project_material_id (
            unit,
            notes,
            materials:material_id (
              name,
              description,
              hsn_code
            )
          )
        `
      )
      .in('purchase_request_id', requestIds)
      .order('created_at', { ascending: true });
    itemRows = (itemsWithConversion.data as PurchaseRequestItemRow[] | null) ?? null;
    itemsError = itemsWithConversion.error;

    if (itemsError && String(itemsError.message || '').includes('purchase_qty')) {
      const fallbackItems = await supabaseAdmin
        .from('purchase_request_items')
        .select(
          `
            id,
            purchase_request_id,
            project_material_id,
            hsn_code,
            item_description,
            requested_qty,
            approved_qty,
            unit_rate,
            tax_percent,
            status,
            created_at,
            project_materials:project_material_id (
              unit,
              notes,
              materials:material_id (
                name,
                description,
                hsn_code
              )
            )
          `
        )
        .in('purchase_request_id', requestIds)
        .order('created_at', { ascending: true });
      itemRows = (fallbackItems.data as PurchaseRequestItemRow[] | null) ?? null;
      itemsError = fallbackItems.error;
    }

    if (itemsError) {
      throw itemsError;
    }

    itemRows?.forEach((item: PurchaseRequestItemRow) => {
      const list = itemsByRequest.get(item.purchase_request_id) || [];
      list.push(item);
      itemsByRequest.set(item.purchase_request_id, list);
    });
  }

  // Fetch vendor names for PRs that have vendor_id set
  const vendorIds = Array.from(
    new Set((requestRows || []).map((r: any) => r.vendor_id).filter(Boolean))
  ) as number[];
  const vendorMap = new Map<number, { name: string; contact_person?: string | null }>();
  if (vendorIds.length > 0) {
    const { data: vendorRows } = await supabaseAdmin
      .from('vendors')
      .select('id, name, contact_person')
      .in('id', vendorIds);
    vendorRows?.forEach((v: any) => vendorMap.set(v.id, v));
  }

  const projectIds = Array.from(new Set((requestRows || []).map((row: { project_id: string }) => row.project_id).filter(Boolean)));
  const projectMap = new Map<string, { name?: string | null; client_name?: string | null; project_address?: string | null }>();

  if (projectIds.length > 0) {
    const { data: projects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, project_name, client_name, project_address')
      .in('id', projectIds);

    if (projectError) {
      console.error('Failed to fetch project metadata:', projectError);
    } else {
      projects?.forEach((project: { id: string; project_name?: string; client_name?: string | null; project_address?: string | null }) => {
        projectMap.set(project.id, {
          name: project.project_name,
          client_name: project.client_name ?? null,
          project_address: project.project_address ?? null
        });
      });
    }
  }

  const invoiceBucket = process.env.INVOICE_STORAGE_BUCKET || 'contractor-documents';

  const normalizedRequests = await Promise.all((requestRows || []).map(async (request: any) => {
    const items = (itemsByRequest.get(request.id) || []).map((item) => ({
      id: item.id,
      project_material_id: item.project_material_id,
      hsn_code: item.hsn_code || item.project_materials?.materials?.hsn_code || null,
      item_description: item.item_description || null,
      site_unit: item.site_unit || item.project_materials?.unit || null,
      purchase_unit: item.purchase_unit || null,
      conversion_factor: item.conversion_factor ?? null,
      purchase_qty: item.purchase_qty ?? null,
      normalized_qty: item.normalized_qty ?? null,
      requested_qty: item.requested_qty,
      approved_qty: item.approved_qty,
      unit_rate: item.unit_rate,
      tax_percent: item.tax_percent,
      status: item.status,
      material_name: item.project_materials?.materials?.name || 'Unknown Material',
      material_description: item.project_materials?.materials?.description || item.project_materials?.notes || null,
      unit: item.project_materials?.unit || 'units'
    }));

    const totalRequestedQty = items.reduce((sum, item) => sum + (item.requested_qty || 0), 0);
    const estimatedTotal = items.reduce((sum, item) => {
      const qty = Number(item.purchase_qty ?? item.requested_qty) || 0;
      const rate = Number(item.unit_rate) || 0;
      const taxPercent = Number(item.tax_percent) || 0;
      const base = qty * rate;
      const tax = base * (taxPercent / 100);
      return sum + base + tax;
    }, 0);

    const vendor = request.vendor_id ? vendorMap.get(request.vendor_id) : null;
    const fallbackPath = `${request.contractor_id}/invoices/${request.id}.pdf`;
    const signedInvoiceUrl = await createSignedUrlWithFallback(supabaseAdmin, {
      sourceUrl: request.invoice_url,
      defaultBucket: invoiceBucket,
      fallbackPath
    });

    return {
      id: request.id,
      project_id: request.project_id,
      contractor_id: request.contractor_id,
      status: request.status,
      remarks: request.remarks,
      approval_notes: request.approval_notes,
      created_at: request.created_at,
      updated_at: request.updated_at,
      submitted_at: request.submitted_at,
      approved_at: request.approved_at,
      funded_at: request.funded_at,
      vendor_id: request.vendor_id || null,
      vendor_assigned_at: request.vendor_assigned_at || null,
      vendor_name: vendor?.name || null,
      vendor_contact: vendor?.contact_person || null,
      delivery_status: request.delivery_status || 'not_dispatched',
      dispatched_at: request.dispatched_at || null,
      dispute_deadline: request.dispute_deadline || null,
      dispute_raised_at: request.dispute_raised_at || null,
      dispute_reason: request.dispute_reason || null,
      delivered_at: request.delivered_at || null,
      invoice_generated_at: request.invoice_generated_at || null,
      invoice_url: request.invoice_url || null,
      invoice_download_url: signedInvoiceUrl || request.invoice_url || null,
      contractors: request.contractors,
      project: projectMap.get(request.project_id) || null,
      purchase_request_items: items,
      total_items: items.length,
      total_requested_qty: totalRequestedQty,
      estimated_total: estimatedTotal
    };
  }));

  const transactionsByRequest = new Map<string, Array<{ purchase_request_id: string; amount: number; transaction_type: string; created_at?: string | null }>>();
  if (requestIds.length > 0) {
    const { data: fundingRows, error: fundingError } = await supabaseAdmin
      .from('capital_transactions')
      .select('purchase_request_id, amount, transaction_type, created_at')
      .in('purchase_request_id', requestIds)
      .in('transaction_type', ['deployment', 'return'])
      .eq('status', 'completed');

    if (fundingError) {
      console.error('Failed to load funding totals for purchase requests:', fundingError);
    } else {
      const grouped = groupTransactionsByPurchaseRequest(
        fundingRows as Array<{ purchase_request_id: string; amount: number; transaction_type: string; created_at?: string | null }>
      );
      grouped.forEach((rows, requestId) => {
        transactionsByRequest.set(requestId, rows);
      });
    }
  }

  const enrichedRequests = normalizedRequests.map((request: any) => {
    const estimatedTotal = request.estimated_total || 0;
    const metrics = calculateCapitalAccrualMetrics({
      transactions: transactionsByRequest.get(request.id) || [],
      terms: {
        platform_fee_rate: request.contractors?.platform_fee_rate,
        platform_fee_cap: request.contractors?.platform_fee_cap,
        participation_fee_rate_daily: request.contractors?.participation_fee_rate_daily
      },
      purchaseRequestTotal: estimatedTotal
    });

    return {
      ...request,
      funded_amount: metrics.fundedAmount,
      returned_amount: metrics.returnedAmount,
      remaining_amount: metrics.remainingAmount,
      funding_progress: metrics.fundingProgress,
      platform_fee: metrics.platformFee,
      participation_fee: metrics.participationFee,
      total_due: metrics.totalDue,
      remaining_due: metrics.remainingDue,
      investor_due: metrics.investorDue,
      remaining_investor_due: metrics.remainingInvestorDue,
      days_outstanding: metrics.daysOutstanding
    };
  });

  return {
    requests: enrichedRequests,
    total: typeof count === 'number' ? count : enrichedRequests.length
  };
}

export async function GET(request: NextRequest) {
  // Apply rate limiting for admin read operations
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ_ONLY);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'submitted';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [{ requests, total }, summary] = await Promise.all([
      fetchPurchaseRequests({ status, limit, offset }),
      fetchPurchaseSummary()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        summary,
        pagination: {
          limit,
          offset,
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase requests' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Apply stricter rate limiting for admin mutation operations (approvals/rejections)
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MUTATION);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Get user info for audit logging
    const user = await currentUser();
    const userId = user?.id || 'unknown';
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    const userName = user?.firstName && user?.lastName ? `${user?.firstName} ${user?.lastName}` : user?.username;
    const userRole = user?.publicMetadata?.role as string || user?.privateMetadata?.role as string || 'admin';

    const body = await request.json();

    // Validate request body
    const validation = await validateRequestBody(updatePurchaseRequestSchema, body);
    if (!validation.success) {
      return 'response' in validation
        ? validation.response
        : NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const {
      purchase_request_id,
      action,
      admin_notes,
      vendor_id
    } = validation.data;

    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, approved_at, status, delivery_status')
      .eq('id', purchase_request_id)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      );
    }

    // Handle vendor assignment separately — no item status change needed
    if (action === 'assign_vendor') {
      if (!vendor_id) {
        return NextResponse.json({ error: 'vendor_id is required for assign_vendor' }, { status: 400 });
      }

      const lockedStatuses = ['funded', 'po_generated', 'completed'];
      if (lockedStatuses.includes(existingRequest.status)) {
        return NextResponse.json(
          { error: `Vendor cannot be changed once request is ${existingRequest.status}` },
          { status: 409 }
        );
      }

      if (existingRequest.delivery_status && existingRequest.delivery_status !== 'not_dispatched') {
        return NextResponse.json(
          { error: `Vendor cannot be changed once delivery is ${existingRequest.delivery_status}` },
          { status: 409 }
        );
      }
      const { error: vendorError } = await supabaseAdmin
        .from('purchase_requests')
        .update({ vendor_id, vendor_assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', purchase_request_id);

      if (vendorError) {
        console.error('Failed to assign vendor:', vendorError);
        return NextResponse.json({ error: 'Failed to assign vendor. Run the add-vendor-to-purchase-requests migration first.', details: vendorError.message }, { status: 500 });
      }

      // Audit log for vendor assignment
      const { data: vendorData } = await supabaseAdmin
        .from('vendors')
        .select('name')
        .eq('id', vendor_id)
        .single();

      await auditVendorAssignment({
        purchaseRequestId: purchase_request_id,
        vendorId: String(vendor_id),
        vendorName: vendorData?.name,
        userId,
        userEmail,
        userName,
        userRole,
        oldVendorId: existingRequest.vendor_id ? String(existingRequest.vendor_id) : undefined,
        request
      });

      const { requests } = await fetchPurchaseRequests({ ids: [purchase_request_id] });
      return NextResponse.json({ success: true, data: requests[0] || null, message: 'Vendor assigned successfully' });
    }

    // Gate approval behind vendor assignment (only if vendor column exists)
    const { data: vendorCheck } = await supabaseAdmin
      .from('purchase_requests')
      .select('vendor_id')
      .eq('id', purchase_request_id)
      .single();

    if (action === 'approve_for_purchase' && vendorCheck && !vendorCheck.vendor_id) {
      return NextResponse.json(
        { error: 'A vendor must be assigned before approving a purchase request' },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();
    const updates: PurchaseRequestUpdate = {
      updated_at: now,
      approval_notes: admin_notes || null
    };

    let itemStatus: 'approved' | 'ordered' | 'rejected' = 'approved';

    switch (action) {
      case 'approve_for_purchase':
        updates.status = 'approved';
        updates.approved_at = now;
        itemStatus = 'approved';
        break;
      case 'approve_for_funding':
        updates.status = 'funded';
        updates.funded_at = now;
        updates.approved_at = existingRequest.approved_at || now;
        itemStatus = 'ordered';
        break;
      case 'reject':
        updates.status = 'rejected';
        itemStatus = 'rejected';
        break;
    }

    const { data: requestItems, error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select('id, requested_qty')
      .eq('purchase_request_id', purchase_request_id);

    if (itemsError) {
      console.error('Failed to fetch purchase request items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to update purchase request items' },
        { status: 500 }
      );
    }

    if (requestItems && requestItems.length > 0) {
      await Promise.all(
        requestItems.map((item: { id: string; requested_qty: number }) => {
          const itemUpdate: PurchaseRequestItemUpdate = {
            status: itemStatus,
            updated_at: now
          };

          if (action === 'reject') {
            itemUpdate.approved_qty = null;
          } else {
            itemUpdate.approved_qty = item.requested_qty;
          }

          return supabaseAdmin
            .from('purchase_request_items')
            .update(itemUpdate)
            .eq('id', item.id);
        })
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('purchase_requests')
      .update(updates)
      .eq('id', purchase_request_id);

    if (updateError) {
      console.error('Failed to update purchase request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update purchase request' },
        { status: 500 }
      );
    }

    const { requests } = await fetchPurchaseRequests({ ids: [purchase_request_id] });
    const updatedRequest = requests[0] || null;

    const contractorEmail = updatedRequest?.contractors?.email;
    const contractorName = updatedRequest?.contractors?.contact_person || updatedRequest?.contractors?.company_name;
    const projectName = updatedRequest?.project?.name || updatedRequest?.project_id;
    const estimatedTotal = Number(updatedRequest?.estimated_total || 0);

    // Audit log for status change
    const auditAction = action === 'reject' ? 'reject' : 'approve';
    const actionLabel =
      action === 'approve_for_purchase'
        ? 'approved'
        : action === 'approve_for_funding'
        ? 'funded'
        : 'rejected';

    await auditPurchaseRequest({
      action: auditAction,
      purchaseRequestId: purchase_request_id,
      userId,
      userEmail,
      userName,
      userRole,
      oldStatus: existingRequest.status,
      newStatus: updates.status!,
      description: `${actionLabel} purchase request${admin_notes ? ': ' + admin_notes : ''}`,
      metadata: {
        estimated_total: estimatedTotal,
        project_name: projectName,
        contractor_email: contractorEmail,
        action_type: action
      },
      request
    });

    if (contractorEmail && updatedRequest) {
      try {
        await sendEmail({
          to: contractorEmail,
          ...purchaseRequestStatusEmail({
            recipientName: contractorName || 'there',
            projectName: projectName || updatedRequest.project_id,
            statusLabel: actionLabel,
            estimatedValue: estimatedTotal,
            purchaseRequestId: updatedRequest.id,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send purchase request status email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Purchase request ${action.replace(/_/g, ' ')}d successfully`
    });
  } catch (error) {
    console.error('Error updating purchase request:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}
