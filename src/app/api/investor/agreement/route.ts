import { NextResponse } from 'next/server';
import { createAgreementSignedUrl, getInvestorAgreementForCurrentUser } from '@/lib/agreements/service';

export async function GET() {
  try {
    const { investor, agreement } = await getInvestorAgreementForCurrentUser();
    if (!investor) {
      return NextResponse.json({ error: 'Investor profile not found' }, { status: 404 });
    }

    const draftUrl = await createAgreementSignedUrl(agreement?.draft_pdf_path || null);
    const signedUrl = await createAgreementSignedUrl(agreement?.signed_pdf_path || null);
    const executedUrl = await createAgreementSignedUrl(agreement?.executed_pdf_path || null);

    return NextResponse.json({
      success: true,
      investor,
      agreement,
      files: {
        draft_url: draftUrl,
        signed_url: signedUrl,
        executed_url: executedUrl,
      },
    });
  } catch (error) {
    console.error('Error loading investor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load agreement' },
      { status: 500 }
    );
  }
}
