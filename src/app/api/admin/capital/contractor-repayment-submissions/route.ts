import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { recordCapitalReturn } from '@/lib/capital-returns';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const DOC_BUCKET = 'contractor-documents';
const db = supabase as any;

type ReviewAction = 'approve' | 'reject';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'pending').toLowerCase();

    let query = db
      .from('contractor_repayment_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch contractor repayment submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch contractor repayment submissions' }, { status: 500 });
    }

    const contractorIds = Array.from(new Set((data || []).map((row: any) => row.contractor_id).filter(Boolean)));
    const purchaseRequestIds = Array.from(new Set((data || []).map((row: any) => row.purchase_request_id).filter(Boolean)));

    const [{ data: contractors }, { data: purchaseRequests }] = await Promise.all([
      contractorIds.length
        ? db.from('contractors').select('id, company_name, email').in('id', contractorIds)
        : Promise.resolve({ data: [] as any[] }),
      purchaseRequestIds.length
        ? db.from('purchase_requests').select('id, project_id').in('id', purchaseRequestIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const projectIds = Array.from(new Set((purchaseRequests || []).map((row: any) => row.project_id).filter(Boolean)));
    const { data: projects } = projectIds.length
      ? await db.from('projects').select('id, project_name').in('id', projectIds)
      : { data: [] as any[] };

    const contractorMap = new Map((contractors || []).map((contractor: any) => [contractor.id, contractor]));
    const projectMap = new Map((projects || []).map((project: any) => [project.id, project]));
    const purchaseRequestMap = new Map(
      (purchaseRequests || []).map((purchaseRequest: any) => [
        purchaseRequest.id,
        {
          ...purchaseRequest,
          project: purchaseRequest.project_id ? projectMap.get(purchaseRequest.project_id) || null : null,
        },
      ])
    );

    const submissions = await Promise.all(
      (data || []).map(async (submission: any) => {
        if (!submission.proof_document_path) {
          return {
            ...submission,
            contractor: contractorMap.get(submission.contractor_id) || null,
            purchase_request: purchaseRequestMap.get(submission.purchase_request_id) || null,
            proof_signed_url: null,
          };
        }

        const { data: signedUrlData } = await db.storage
          .from(DOC_BUCKET)
          .createSignedUrl(submission.proof_document_path, 60 * 60);

        return {
          ...submission,
          contractor: contractorMap.get(submission.contractor_id) || null,
          purchase_request: purchaseRequestMap.get(submission.purchase_request_id) || null,
          proof_signed_url: signedUrlData?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('Error in GET /api/admin/capital/contractor-repayment-submissions:', error);
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
      .from('contractor_repayment_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Repayment submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'This repayment submission has already been reviewed' }, { status: 400 });
    }

    if (action === 'reject') {
      const { data: rejected, error: rejectError } = await db
        .from('contractor_repayment_submissions')
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
        console.error('Failed to reject contractor repayment submission:', rejectError);
        return NextResponse.json({ error: 'Failed to reject repayment submission' }, { status: 500 });
      }

      return NextResponse.json({ success: true, submission: rejected });
    }

    const paymentDate = String(submission.payment_date || '').trim();
    const transactionTimestamp = new Date(`${paymentDate}T00:00:00.000Z`);
    if (Number.isNaN(transactionTimestamp.getTime())) {
      return NextResponse.json({ error: 'Invalid payment date on repayment submission' }, { status: 400 });
    }

    const description = String(
      body.description || `Capital return for purchase request ${String(submission.purchase_request_id || '').slice(0, 8).toUpperCase()}`
    ).trim();
    const referenceNumber = String(
      body.reference_number || submission.payment_reference || ''
    ).trim();

    const result = await recordCapitalReturn({
      purchaseRequestId: String(submission.purchase_request_id),
      amount: Number(submission.amount || 0),
      description,
      referenceNumber: referenceNumber || null,
      transactionTimestamp,
      adminUserId: adminUser?.id || 'unknown',
    });

    const processedTransactionIds = result.transactions.map((transaction) => transaction.id);

    const { data: approved, error: updateError } = await db
      .from('contractor_repayment_submissions')
      .update({
        status: 'approved',
        review_notes: reviewNotes || null,
        approved_at: new Date().toISOString(),
        approved_by: adminUser?.id || 'unknown',
        processed_transaction_ids: processedTransactionIds,
      })
      .eq('id', submissionId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to mark contractor repayment submission as approved:', updateError);
      return NextResponse.json({ error: 'Failed to update repayment submission status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, submission: approved, transactions: result.transactions });
  } catch (error) {
    console.error('Error in PATCH /api/admin/capital/contractor-repayment-submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to review repayment submission' },
      { status: 500 }
    );
  }
}
