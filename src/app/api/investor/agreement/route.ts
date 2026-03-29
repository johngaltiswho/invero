import { NextResponse } from 'next/server';
import { createAgreementSignedUrl, getInvestorAgreementsForCurrentUser, selectCurrentInvestorAgreements } from '@/lib/agreements/service';

export async function GET() {
  try {
    const { investor, agreements } = await getInvestorAgreementsForCurrentUser();
    if (!investor) {
      return NextResponse.json({ error: 'Investor profile not found' }, { status: 404 });
    }

    const currentAgreements = selectCurrentInvestorAgreements(agreements || []).filter((agreement) =>
      ['issued', 'investor_signed', 'executed'].includes(String(agreement.status || ''))
    );

    const agreementsWithFiles = await Promise.all(
      currentAgreements.map(async (agreement) => ({
        ...agreement,
        funding_unlocked: agreement.status === 'executed',
        files: {
          draft_url: await createAgreementSignedUrl(agreement?.draft_pdf_path || null),
          signed_url: await createAgreementSignedUrl(agreement?.signed_pdf_path || null),
          executed_url: await createAgreementSignedUrl(agreement?.executed_pdf_path || null),
        },
      }))
    );

    return NextResponse.json({
      success: true,
      investor,
      agreements: agreementsWithFiles,
    });
  } catch (error) {
    console.error('Error loading investor agreement:', error);
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load agreement' },
      { status: 500 }
    );
  }
}
