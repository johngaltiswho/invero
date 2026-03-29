import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { selectCurrentInvestorAgreements } from '@/lib/agreements/service';

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

function buildAgreementDocumentName(input: {
  agreementModelType?: string | null;
  documentType: 'agreement-draft' | 'agreement-signed' | 'agreement-executed';
  sleeveName?: string | null;
}) {
  const baseLabel =
    input.agreementModelType === 'fixed_debt' ? 'Fixed Debt Sleeve' : 'Pool Participation Sleeve';
  const sleeveLabel = input.sleeveName || baseLabel;
  const statusLabel =
    input.documentType === 'agreement-executed'
      ? 'Executed Agreement'
      : input.documentType === 'agreement-signed'
        ? 'Signed Agreement'
        : 'Agreement Draft';

  return `${sleeveLabel} - ${statusLabel}.pdf`;
}

export async function GET() {
  try {
    const investor = await getActiveInvestor();
    await ensureBucket();

    const { data: agreements, error: agreementsError } = await supabaseAdmin
      .from('investor_agreements')
      .select('id, lender_sleeve_id, agreement_model_type, draft_pdf_path, signed_pdf_path, executed_pdf_path, updated_at, created_at, superseded_at, status')
      .eq('investor_id', investor.id)
      .order('updated_at', { ascending: false });

    if (agreementsError) {
      console.error('Failed to load investor agreements for documents:', agreementsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    const { data: sleeves } = await supabaseAdmin
      .from('lender_sleeves')
      .select('id, name, model_type')
      .eq('investor_id', investor.id);

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

    const sleeveMap = new Map<string, { id: string; name: string; model_type?: string | null }>(
      ((sleeves || []) as Array<{ id: string; name: string; model_type?: string | null }>).map((sleeve) => [sleeve.id, sleeve])
    );

    const latestAgreementPaths = new Map<
      string,
      {
        storagePath: string;
        documentType: 'agreement-draft' | 'agreement-signed' | 'agreement-executed';
        agreementModelType?: string | null;
        sleeveName?: string | null;
        createdAt?: string | null;
      }
    >();

    for (const agreement of selectCurrentInvestorAgreements((agreements || []) as any[])) {
      const sleeve = agreement.lender_sleeve_id ? sleeveMap.get(agreement.lender_sleeve_id) : null;
      const groupKeyPrefix = agreement.lender_sleeve_id || agreement.agreement_model_type || 'legacy';
      const candidatePaths = [
        {
          key: `${groupKeyPrefix}:agreement-draft`,
          storagePath: agreement.draft_pdf_path,
          documentType: 'agreement-draft' as const,
        },
        {
          key: `${groupKeyPrefix}:agreement-signed`,
          storagePath: agreement.signed_pdf_path,
          documentType: 'agreement-signed' as const,
        },
        {
          key: `${groupKeyPrefix}:agreement-executed`,
          storagePath: agreement.executed_pdf_path,
          documentType: 'agreement-executed' as const,
        },
      ];

      for (const candidate of candidatePaths) {
        if (!candidate.storagePath || latestAgreementPaths.has(candidate.key)) continue;
        latestAgreementPaths.set(candidate.key, {
          storagePath: candidate.storagePath,
          documentType: candidate.documentType,
          agreementModelType: agreement.agreement_model_type,
          sleeveName: sleeve?.name || null,
          createdAt: agreement.updated_at || agreement.created_at || null,
        });
      }
    }

    const agreementPathSet = new Set(
      Array.from(latestAgreementPaths.values()).map((document) => document.storagePath)
    );

    const filteredFiles = (files || []).filter(
      (file: any) => file.metadata?.size && !String(file.name || '').startsWith('agreement-')
    );

    const storageDocuments = await Promise.all(
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

    const agreementDocuments = await Promise.all(
      Array.from(latestAgreementPaths.values()).map(async (document) => {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(document.storagePath, 60 * 60);

        return {
          name: buildAgreementDocumentName({
            agreementModelType: document.agreementModelType,
            documentType: document.documentType,
            sleeveName: document.sleeveName,
          }),
          documentType: document.documentType,
          size: 0,
          createdAt: document.createdAt || null,
          path: document.storagePath,
          signedUrl: signed?.signedUrl || null,
        };
      })
    );

    const documents = [...agreementDocuments, ...storageDocuments]
      .filter((document) => document.signedUrl || !agreementPathSet.has(document.path))
      .sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });

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

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const storageFileName = `${documentType}__${Date.now()}__${sanitizedName}`;
    const storagePath = `${investor.id}/${storageFileName}`;

    if (documentType === 'pan') {
      const { data: existingFiles } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(investor.id, {
          limit: 200,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      const panFiles = (existingFiles || [])
        .filter((fileItem: any) => fileItem.name?.startsWith('pan__'))
        .map((fileItem: any) => `${investor.id}/${fileItem.name}`);

      if (panFiles.length > 0) {
        await supabaseAdmin.storage.from(BUCKET).remove(panFiles);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
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
