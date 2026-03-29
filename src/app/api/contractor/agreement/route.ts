import { NextResponse } from 'next/server';
import {
  createContractorAgreementSignedUrl,
  listContractorAgreementsForCurrentUser,
} from '@/lib/contractor-agreements/service';

export async function GET() {
  try {
    const { contractor, agreements } = await listContractorAgreementsForCurrentUser();
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const agreementsWithFiles = await Promise.all(
      agreements.map(async (agreement) => ({
        agreement,
        files: {
          draft_url: await createContractorAgreementSignedUrl(agreement.draft_pdf_path || null),
          signed_url: await createContractorAgreementSignedUrl(agreement.signed_pdf_path || null),
          executed_url: await createContractorAgreementSignedUrl(agreement.executed_pdf_path || null),
        },
      }))
    );

    return NextResponse.json({
      success: true,
      contractor,
      agreements: agreementsWithFiles,
    });
  } catch (error) {
    console.error('Error loading contractor agreement:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load agreement' },
      { status: 500 }
    );
  }
}
