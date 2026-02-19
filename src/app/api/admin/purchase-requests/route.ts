import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, formatCurrency } from '@/lib/email';
import { createSignedUrlWithFallback } from '@/lib/storage-url';

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
    const { data: itemRows, error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .select(
        `
          id,
          purchase_request_id,
          project_material_id,
          hsn_code,
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
  const projectMap = new Map<string, { name?: string | null }>();

  if (projectIds.length > 0) {
    const { data: projects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, project_name')
      .in('id', projectIds);

    if (projectError) {
      console.error('Failed to fetch project metadata:', projectError);
    } else {
      projects?.forEach((project: { id: string; project_name?: string }) => {
        projectMap.set(project.id, {
          name: (project as { project_name?: string }).project_name
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
      const qty = Number(item.requested_qty) || 0;
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

  const fundingTotals = new Map<string, number>();
  const returnTotals = new Map<string, number>();
  const firstDeploymentAt = new Map<string, string>();
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
      fundingRows?.forEach((row: { purchase_request_id: string; amount: number; transaction_type: string; created_at?: string | null }) => {
        if (!row.purchase_request_id) return;
        const amount = Number(row.amount) || 0;
        if (row.transaction_type === 'deployment') {
          const current = fundingTotals.get(row.purchase_request_id) || 0;
          fundingTotals.set(row.purchase_request_id, current + amount);
          if (row.created_at) {
            const existing = firstDeploymentAt.get(row.purchase_request_id);
            if (!existing || new Date(row.created_at).getTime() < new Date(existing).getTime()) {
              firstDeploymentAt.set(row.purchase_request_id, row.created_at);
            }
          }
        }
        if (row.transaction_type === 'return') {
          const current = returnTotals.get(row.purchase_request_id) || 0;
          returnTotals.set(row.purchase_request_id, current + amount);
        }
      });
    }
  }

  const enrichedRequests = normalizedRequests.map((request: any) => {
    const fundedAmount = fundingTotals.get(request.id) || 0;
    const returnedAmount = returnTotals.get(request.id) || 0;
    const estimatedTotal = request.estimated_total || 0;
    const remainingAmount = Math.max(estimatedTotal - fundedAmount, 0);
    const fundingProgress = estimatedTotal > 0 ? Math.min(fundedAmount / estimatedTotal, 1) : null;
    const platformRate = request.contractors?.platform_fee_rate ?? 0.0025;
    const platformCap = request.contractors?.platform_fee_cap ?? 25000;
    const participationFeeRate = request.contractors?.participation_fee_rate_daily ?? 0.001;
    const deployedAt = firstDeploymentAt.get(request.id);
    const daysOutstanding = deployedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(deployedAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const platformFee = Math.min(fundedAmount * platformRate, platformCap);
    const participationFee = fundedAmount * participationFeeRate * daysOutstanding;
    const totalDue = fundedAmount + platformFee + participationFee;
    const investorDue = fundedAmount + participationFee;
    const remainingDue = Math.max(totalDue - returnedAmount, 0);
    const remainingInvestorDue = Math.max(investorDue - returnedAmount, 0);

    return {
      ...request,
      funded_amount: fundedAmount,
      returned_amount: returnedAmount,
      remaining_amount: remainingAmount,
      funding_progress: fundingProgress,
      platform_fee: platformFee,
      participation_fee: participationFee,
      total_due: totalDue,
      remaining_due: remainingDue,
      investor_due: investorDue,
      remaining_investor_due: remainingInvestorDue,
      days_outstanding: daysOutstanding
    };
  });

  return {
    requests: enrichedRequests,
    total: typeof count === 'number' ? count : enrichedRequests.length
  };
}

export async function GET(request: NextRequest) {
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
  try {
    const body = await request.json();
    const {
      purchase_request_id,
      action,
      admin_notes
    } = body;
    // vendor_id read from body directly below when needed

    if (!purchase_request_id) {
      return NextResponse.json(
        { error: 'purchase_request_id is required' },
        { status: 400 }
      );
    }

    const validActions = ['approve_for_purchase', 'approve_for_funding', 'reject', 'assign_vendor'] as const;
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

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

      const { vendor_id } = body;
      if (!vendor_id) {
        return NextResponse.json({ error: 'vendor_id is required for assign_vendor' }, { status: 400 });
      }
      const { error: vendorError } = await supabaseAdmin
        .from('purchase_requests')
        .update({ vendor_id, vendor_assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', purchase_request_id);

      if (vendorError) {
        console.error('Failed to assign vendor:', vendorError);
        return NextResponse.json({ error: 'Failed to assign vendor. Run the add-vendor-to-purchase-requests migration first.', details: vendorError.message }, { status: 500 });
      }
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

    if (contractorEmail && updatedRequest) {
      const actionLabel =
        action === 'approve_for_purchase'
          ? 'approved'
          : action === 'approve_for_funding'
          ? 'funded'
          : 'rejected';

      await sendEmail({
        to: contractorEmail,
        subject: `Purchase request ${actionLabel} · ${projectName || 'Project'}`,
        text: `Hi ${contractorName || 'there'},\n\nYour purchase request has been ${actionLabel}.\nProject: ${projectName || updatedRequest.project_id}\nEstimated value: ${formatCurrency(estimatedTotal)}\n\nPR ID: ${updatedRequest.id}`,
        html: `
          <p>Hi ${contractorName || 'there'},</p>
          <p>Your purchase request has been <strong>${actionLabel}</strong>.</p>
          <p><strong>Project:</strong> ${projectName || updatedRequest.project_id}<br/>
          <strong>Estimated value:</strong> ${formatCurrency(estimatedTotal)}</p>
          <p><strong>PR ID:</strong> ${updatedRequest.id}</p>
        `
      });
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
