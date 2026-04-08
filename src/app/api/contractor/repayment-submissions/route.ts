import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getPurchaseRequestRepaymentSnapshot } from '@/lib/capital-returns';

const DOC_BUCKET = 'contractor-documents';

async function resolveContractor() {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Not authenticated', status: 401 as const };
  }

  const { data: byClerkId, error: byClerkIdError } = await supabaseAdmin
    .from('contractors')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (byClerkIdError) {
    console.error('Error fetching contractor by clerk_user_id:', byClerkIdError);
    return { error: 'Failed to load contractor profile', status: 500 as const };
  }

  if (byClerkId) {
    return { contractor: byClerkId };
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  const { data: byEmail, error: byEmailError } = await supabaseAdmin
    .from('contractors')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (byEmailError) {
    console.error('Error fetching contractor by email fallback:', byEmailError);
    return { error: 'Failed to load contractor profile', status: 500 as const };
  }

  if (!byEmail) {
    return { error: 'Contractor profile not found', status: 404 as const };
  }

  if (!byEmail.clerk_user_id) {
    await supabaseAdmin.from('contractors').update({ clerk_user_id: userId }).eq('id', byEmail.id);
  }

  return { contractor: byEmail };
}

async function createProofSignedUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabaseAdmin.storage.from(DOC_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}

export async function GET() {
  try {
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { contractor } = resolved;

    const { data, error } = await supabaseAdmin
      .from('contractor_repayment_submissions')
      .select('*')
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load contractor repayment submissions:', error);
      return NextResponse.json({ error: 'Failed to load repayment submissions' }, { status: 500 });
    }

    const purchaseRequestIds = Array.from(new Set((data || []).map((row: any) => row.purchase_request_id).filter(Boolean)));
    const { data: purchaseRequests } = purchaseRequestIds.length
      ? await supabaseAdmin
          .from('purchase_requests')
          .select('id, project_id')
          .in('id', purchaseRequestIds)
      : { data: [] as any[] };

    const projectIds = Array.from(new Set((purchaseRequests || []).map((row: any) => row.project_id).filter(Boolean)));
    const { data: projects } = projectIds.length
      ? await supabaseAdmin
          .from('projects')
          .select('id, project_name')
          .in('id', projectIds)
      : { data: [] as any[] };

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
      (data || []).map(async (row: any) => ({
        ...row,
        purchase_request: purchaseRequestMap.get(row.purchase_request_id) || null,
        proof_signed_url: await createProofSignedUrl(row.proof_document_path),
      }))
    );

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('Error loading contractor repayment submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load repayment submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveContractor();
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { contractor } = resolved;
    const contentType = request.headers.get('content-type') || '';

    let amount = 0;
    let paymentDate = '';
    let paymentMethod = 'bank_transfer';
    let paymentReference = '';
    let notes = '';
    let purchaseRequestId = '';
    let proofDocumentPath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      amount = Number(formData.get('amount'));
      paymentDate = String(formData.get('payment_date') || '');
      paymentMethod = String(formData.get('payment_method') || 'bank_transfer');
      paymentReference = String(formData.get('payment_reference') || '');
      notes = String(formData.get('notes') || '');
      purchaseRequestId = String(formData.get('purchase_request_id') || '');

      const proofFile = formData.get('proof_file') as File | null;
      if (proofFile) {
        const sanitizedName = proofFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
        const fileName = `repayment-proof__${Date.now()}__${sanitizedName}`;
        const filePath = `${contractor.id}/${fileName}`;
        const buffer = Buffer.from(await proofFile.arrayBuffer());
        const { error: uploadError } = await supabaseAdmin.storage
          .from(DOC_BUCKET)
          .upload(filePath, buffer, {
            contentType: proofFile.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.error('Failed to upload contractor repayment proof:', uploadError);
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
      purchaseRequestId = String(body.purchase_request_id || '');
    }

    if (!purchaseRequestId) {
      return NextResponse.json({ error: 'Purchase request is required' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Repayment amount must be a positive number' }, { status: 400 });
    }

    if (!paymentDate) {
      return NextResponse.json({ error: 'Payment date is required' }, { status: 400 });
    }

    const { data: purchaseRequest, error: requestError } = await supabaseAdmin
      .from('purchase_requests')
      .select('id, contractor_id, status')
      .eq('id', purchaseRequestId)
      .single();

    if (requestError || !purchaseRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    if (purchaseRequest.contractor_id !== contractor.id) {
      return NextResponse.json({ error: 'You can only submit repayments for your own purchase requests' }, { status: 403 });
    }

    const normalizedStatus = String(purchaseRequest.status || '').toLowerCase();
    if (!['funded', 'po_generated', 'completed'].includes(normalizedStatus)) {
      return NextResponse.json({ error: 'This purchase request is not yet eligible for repayment' }, { status: 400 });
    }

    const snapshot = await getPurchaseRequestRepaymentSnapshot(purchaseRequestId);
    if (snapshot.metrics.remainingDue <= 0.009) {
      return NextResponse.json({ error: 'This purchase request has already been fully repaid' }, { status: 400 });
    }

    if (amount - snapshot.metrics.remainingDue > 0.01) {
      return NextResponse.json(
        { error: `Repayment exceeds the current repayable balance of ${snapshot.metrics.remainingDue.toFixed(2)}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('contractor_repayment_submissions')
      .insert([
        {
          contractor_id: contractor.id,
          purchase_request_id: purchaseRequestId,
          amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          notes: notes || null,
          proof_document_path: proofDocumentPath,
          status: 'pending',
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create contractor repayment submission:', error);
      return NextResponse.json({ error: 'Failed to submit repayment confirmation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, submission: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating contractor repayment submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit repayment confirmation' },
      { status: 500 }
    );
  }
}
