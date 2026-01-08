import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'investor-documents';

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((bucket: any) => bucket.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024
    });
  }
}

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
    .select('*')
    .eq('email', userEmail)
    .eq('status', 'active')
    .single();

  if (error || !investor) {
    throw new Error('Investor profile not found');
  }

  return investor;
}

function parseDocumentMetadata(fileName: string) {
  const parts = fileName.split('__');
  if (parts.length >= 3) {
    const [type, timestamp, ...rest] = parts;
    return {
      documentType: type || 'general',
      originalName: rest.join('__') || fileName,
      uploadedAt: Number(timestamp) || null
    };
  }

  return {
    documentType: 'general',
    originalName: fileName,
    uploadedAt: null
  };
}

export async function GET() {
  try {
    const investor = await getActiveInvestor();
    await ensureBucket();

    const { data: files, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(investor.id, {
        limit: 200,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Failed to list investor documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    const filteredFiles = (files || []).filter((file: any) => file.metadata?.size);

    const documents = await Promise.all(
      filteredFiles.map(async (file: any) => {
        const storagePath = `${investor.id}/${file.name}`;
        const { documentType, originalName, uploadedAt } = parseDocumentMetadata(file.name);

        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, 60 * 60);

        return {
          name: originalName,
          documentType,
          size: file.metadata?.size || 0,
          createdAt: file.created_at || uploadedAt || null,
          path: storagePath,
          signedUrl: signed?.signedUrl || null
        };
      })
    );

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching investor documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const investor = await getActiveInvestor();
    await ensureBucket();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType')?.toString() || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const storageFileName = `${documentType}__${Date.now()}__${sanitizedName}`;
    const storagePath = `${investor.id}/${storageFileName}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (error) {
      console.error('Failed to upload investor document:', error);
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: {
        name: sanitizedName,
        documentType,
        size: file.size,
        path: storagePath
      }
    });
  } catch (error) {
    console.error('Error uploading investor document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
