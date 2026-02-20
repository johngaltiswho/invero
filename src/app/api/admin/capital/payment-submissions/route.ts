import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const DOC_BUCKET = 'investor-documents';

type ReviewAction = 'approve' | 'reject';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'pending').toLowerCase();

    let query = supabase
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
      (data || []).map(async (submission) => {
        if (!submission.proof_document_path) {
          return { ...submission, proof_signed_url: null };
        }

        const { data: signedUrlData } = await supabase.storage
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

    const { data: submission, error: fetchError } = await supabase
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
      const { data: rejected, error: rejectError } = await supabase
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

      return NextResponse.json({ success: true, submission: rejected });
    }

    const { error: ensureAccountError } = await supabase
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

    const { data: transaction, error: transactionError } = await supabase
      .from('capital_transactions')
      .insert([
        {
          investor_id: submission.investor_id,
          transaction_type: 'inflow',
          amount: Number(submission.amount),
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

    const { data: approved, error: updateError } = await supabase
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

    return NextResponse.json({ success: true, submission: approved, transaction });
  } catch (error) {
    console.error('Error in PATCH /api/admin/capital/payment-submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
