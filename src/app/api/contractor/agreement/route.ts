import { NextResponse } from 'next/server';
import {
  createContractorAgreementSignedUrl,
  getContractorAgreementForCurrentUser,
} from '@/lib/contractor-agreements/service';

export async function GET() {
  try {
    const { contractor, agreement } = await getContractorAgreementForCurrentUser();
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const draftUrl = await createContractorAgreementSignedUrl(agreement?.draft_pdf_path || null);
    const signedUrl = await createContractorAgreementSignedUrl(agreement?.signed_pdf_path || null);
    const executedUrl = await createContractorAgreementSignedUrl(agreement?.executed_pdf_path || null);

    return NextResponse.json({
      success: true,
      contractor,
      agreement,
      files: {
        draft_url: draftUrl,
        signed_url: signedUrl,
        executed_url: executedUrl,
      },
    });
  } catch (error) {
    console.error('Error loading contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load agreement' },
      { status: 500 }
    );
  }
}
