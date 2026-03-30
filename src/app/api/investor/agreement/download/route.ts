import { NextRequest, NextResponse } from 'next/server';
import { createAgreementSignedUrl, getInvestorAgreementsForCurrentUser, selectCurrentInvestorAgreements } from '@/lib/agreements/service';
import { getInvestorAuthErrorStatus } from '@/lib/investor-auth';

export async function GET(request: NextRequest) {
  try {
    const { agreements } = await getInvestorAgreementsForCurrentUser();
    const requestedAgreementId = new URL(request.url).searchParams.get('agreement_id');
    const currentAgreements = selectCurrentInvestorAgreements(agreements || []);
    const agreement = requestedAgreementId
      ? (agreements || []).find((candidate) => candidate.id === requestedAgreementId) || null
      : currentAgreements[0] || null;
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const kind = new URL(request.url).searchParams.get('kind') || 'executed';
    const path =
      kind === 'draft'
        ? agreement.draft_pdf_path
        : kind === 'signed'
          ? agreement.signed_pdf_path
          : agreement.executed_pdf_path;

    if (!path) {
      return NextResponse.json({ error: 'Requested agreement file not available' }, { status: 404 });
    }

    const signedUrl = await createAgreementSignedUrl(path);
    return NextResponse.redirect(signedUrl!);
  } catch (error) {
    console.error('Error downloading investor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download agreement' },
      { status: getInvestorAuthErrorStatus(error) }
    );
  }
}
