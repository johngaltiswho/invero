import { NextRequest, NextResponse } from 'next/server';
import {
  createContractorAgreementSignedUrl,
  getContractorAgreementForCurrentUser,
} from '@/lib/contractor-agreements/service';

export async function GET(request: NextRequest) {
  try {
    const { agreement } = await getContractorAgreementForCurrentUser();
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

    const signedUrl = await createContractorAgreementSignedUrl(path);
    return NextResponse.redirect(signedUrl!);
  } catch (error) {
    console.error('Error downloading contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download agreement' },
      { status: 500 }
    );
  }
}
