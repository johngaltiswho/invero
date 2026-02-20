import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

const DOC_BUCKET = 'investor-documents';

async function getActiveInvestor() {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!userEmail) {
    throw new Error('Missing email');
  }

  const { data: investor, error } = await supabaseAdmin
    .from('investors')
    .select('id, email, name, status')
    .eq('email', userEmail)
    .eq('status', 'active')
    .single();

  if (error || !investor) {
    throw new Error('Investor profile not found');
  }

  return investor;
}

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
    const investor = await getActiveInvestor();

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
    return NextResponse.json({ error: 'Failed to load payment submissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const investor = await getActiveInvestor();

    const contentType = request.headers.get('content-type') || '';

    let amount = 0;
    let paymentDate = '';
    let paymentMethod = 'bank_transfer';
    let paymentReference = '';
    let notes = '';
    let proofDocumentPath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      await ensureBucket();
      const formData = await request.formData();
      amount = Number(formData.get('amount'));
      paymentDate = String(formData.get('payment_date') || '');
      paymentMethod = String(formData.get('payment_method') || 'bank_transfer');
      paymentReference = String(formData.get('payment_reference') || '');
      notes = String(formData.get('notes') || '');

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
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (!paymentDate) {
      return NextResponse.json({ error: 'Payment date is required' }, { status: 400 });
    }

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

    return NextResponse.json({ success: true, submission: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating investor payment submission:', error);
    return NextResponse.json({ error: 'Failed to submit payment confirmation' }, { status: 500 });
  }
}
