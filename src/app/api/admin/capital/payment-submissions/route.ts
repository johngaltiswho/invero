import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import {
  applyLenderCapitalAllocations,
  normalizeLenderCapitalAllocations,
} from '@/lib/lender-sleeves';
import { calculateSoftPoolValuation } from '@/lib/pool-valuation';
import {
  getLenderAllocationIntentById,
  syncAllocationIntentFundingStatus,
  refreshAllocationIntentReadiness,
} from '@/lib/lender-allocation-intents';
import { supabaseAdmin as supabase } from '@/lib/supabase';
const DOC_BUCKET = 'investor-documents';
const db = supabase as any;

type ReviewAction = 'approve' | 'reject';
type PaymentSubmissionListItem = {
  proof_document_path?: string | null;
  [key: string]: any;
};
type PaymentSubmissionRow = {
  id: string;
  status: string;
  investor_id: string;
  amount: number | string;
  allocation_intent_id?: string | null;
  allocation_payload?: Array<{ modelType?: string; amount?: number }> | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  proof_document_path?: string | null;
  [key: string]: any;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'pending').toLowerCase();

    let query = db
      .from('investor_payment_submissions')
      .select(`
        *,
        investor:investors!investor_payment_submissions_investor_id_fkey(
          id,
          name,
          email,
          investor_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch payment submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch payment submissions' }, { status: 500 });
    }

    const submissions = await Promise.all(
      ((data || []) as PaymentSubmissionListItem[]).map(async (submission) => {
        if (!submission.proof_document_path) {
          return { ...submission, proof_signed_url: null };
        }

        const { data: signedUrlData } = await db.storage
          .from(DOC_BUCKET)
          .createSignedUrl(submission.proof_document_path, 60 * 60);

        return {
          ...submission,
          proof_signed_url: signedUrlData?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('Error in GET /api/admin/capital/payment-submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();

    const body = await request.json();
    const submissionId = String(body.id || '');
    const action = String(body.action || '') as ReviewAction;
    const reviewNotes = String(body.review_notes || '').trim();

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission id is required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: submission, error: fetchError } = await db
      .from('investor_payment_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Payment submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'This submission has already been reviewed' }, { status: 400 });
    }

    if (action === 'reject') {
      const { data: rejected, error: rejectError } = await db
        .from('investor_payment_submissions')
        .update({
          status: 'rejected',
          review_notes: reviewNotes || null,
          approved_at: new Date().toISOString(),
          approved_by: adminUser?.id || 'unknown',
        })
        .eq('id', submissionId)
        .select('*')
        .single();

      if (rejectError) {
        console.error('Failed to reject payment submission:', rejectError);
        return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 });
      }

      if (submission.allocation_intent_id) {
        await refreshAllocationIntentReadiness(submission.allocation_intent_id);
        await syncAllocationIntentFundingStatus(submission.allocation_intent_id);
      }

      return NextResponse.json({ success: true, submission: rejected });
    }

    const { error: ensureAccountError } = await db
      .from('investor_accounts')
      .upsert({ investor_id: submission.investor_id }, { onConflict: 'investor_id' });

    if (ensureAccountError) {
      console.error('Failed to ensure investor account exists:', ensureAccountError);
      return NextResponse.json({ error: 'Unable to prepare investor account for approval' }, { status: 500 });
    }

    const defaultDescription = `Investor payment confirmation (${submission.payment_method || 'bank_transfer'})`;
    const description = String(body.description || defaultDescription).trim();
    const referenceNumber = String(
      body.reference_number || submission.payment_reference || ''
    ).trim();

    if (!submission.allocation_intent_id) {
      return NextResponse.json({ error: 'Legacy payment submissions are not eligible under the agreement-first flow' }, { status: 400 });
    }

    const allocationIntent = await getLenderAllocationIntentById(submission.allocation_intent_id);
    if (!allocationIntent || allocationIntent.investor_id !== submission.investor_id) {
      return NextResponse.json({ error: 'Linked allocation intent not found' }, { status: 400 });
    }
    if (allocationIntent.status !== 'funding_submitted') {
      return NextResponse.json({ error: 'This payment submission is not linked to a funding-submitted allocation intent' }, { status: 400 });
    }

    const trancheAmount = Number(submission.amount || 0);

    const { data: transaction, error: transactionError } = await db
      .from('capital_transactions')
      .insert([
        {
          investor_id: submission.investor_id,
          transaction_type: 'inflow',
          amount: trancheAmount,
          model_type: Array.isArray(allocationIntent.allocation_payload) && allocationIntent.allocation_payload.length === 1
            ? submission.allocation_payload?.[0]?.modelType || null
            : null,
          description,
          reference_number: referenceNumber || null,
          admin_user_id: adminUser?.id || 'unknown',
          status: 'completed',
        },
      ])
      .select('id, investor_id, amount, transaction_type, created_at')
      .single();

    if (transactionError || !transaction) {
      console.error('Failed to create inflow transaction for submission:', transactionError);
      return NextResponse.json({ error: 'Failed to create capital inflow transaction' }, { status: 500 });
    }

    let normalizedAllocations;
    try {
      normalizedAllocations = normalizeLenderCapitalAllocations(
        trancheAmount,
        Array.isArray(submission.allocation_payload) ? submission.allocation_payload : []
      );
    } catch (allocationError) {
      console.error('Failed to normalize lender allocations:', allocationError);
      return NextResponse.json({ error: 'Invalid lender sleeve allocation payload' }, { status: 400 });
    }

    let poolNavPerUnit: number | null = null;
    if (normalizedAllocations.some((allocation) => allocation.modelType === 'pool_participation')) {
      const [
        poolInflowsRes,
        poolDistributionsRes,
        poolTransactionsRes,
        poolRequestsRes,
        contractorsRes,
        projectsRes,
      ] = await Promise.all([
        db
          .from('capital_transactions')
          .select('investor_id, amount, created_at, status, transaction_type')
          .eq('transaction_type', 'inflow')
          .eq('status', 'completed'),
        db
          .from('capital_transactions')
          .select('investor_id, amount, created_at, status, transaction_type')
          .eq('transaction_type', 'return')
          .not('investor_id', 'is', null)
          .eq('status', 'completed'),
        db
          .from('capital_transactions')
          .select('purchase_request_id, amount, created_at, status, transaction_type')
          .in('transaction_type', ['deployment', 'return'])
          .not('purchase_request_id', 'is', null)
          .eq('status', 'completed'),
        db
          .from('purchase_requests')
          .select('id, project_id, contractor_id, status'),
        db
          .from('contractors')
          .select('id, company_name, participation_fee_rate_daily'),
        db
          .from('projects')
          .select('id, project_name'),
      ]);

      const poolValuation = calculateSoftPoolValuation({
        investorInflows: poolInflowsRes.data || [],
        investorDistributions: poolDistributionsRes.data || [],
        poolTransactions: poolTransactionsRes.data || [],
        purchaseRequests: poolRequestsRes.data || [],
        contractors: contractorsRes.data || [],
        projects: projectsRes.data || [],
      });

      poolNavPerUnit = Number(poolValuation.netNavPerUnit || 0) > 0
        ? Number(poolValuation.netNavPerUnit)
        : 100;
    }

    let sleeves;
    try {
      sleeves = await applyLenderCapitalAllocations({
        investorId: submission.investor_id,
        totalAmount: trancheAmount,
        capitalTransactionId: transaction.id,
        paymentSubmissionId: submissionId,
        allocations: normalizedAllocations,
        poolNavPerUnit,
      });
    } catch (allocationError) {
      console.error('Failed to apply lender allocations:', allocationError);
      return NextResponse.json({ error: 'Failed to apply lender sleeve allocations' }, { status: 500 });
    }

    const { data: approved, error: updateError } = await db
      .from('investor_payment_submissions')
      .update({
        status: 'approved',
        review_notes: reviewNotes || null,
        approved_at: new Date().toISOString(),
        approved_by: adminUser?.id || 'unknown',
        capital_transaction_id: transaction.id,
      })
      .eq('id', submissionId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to mark payment submission as approved:', updateError);
      return NextResponse.json({ error: 'Failed to update payment submission status' }, { status: 500 });
    }

    await syncAllocationIntentFundingStatus(allocationIntent.id);

    return NextResponse.json({ success: true, submission: approved, transaction, sleeves });
  } catch (error) {
    console.error('Error in PATCH /api/admin/capital/payment-submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
