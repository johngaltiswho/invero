import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { signInvestorAgreement } from '@/lib/agreements/service';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const agreement = await signInvestorAgreement({
      agreementId: String(body.agreement_id || ''),
      typedName: String(body.typed_name || ''),
      acceptance: {
        own_funds: Boolean(body.own_funds),
        private_investment: Boolean(body.private_investment),
        risk_disclosure: Boolean(body.risk_disclosure),
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.emailAddresses[0]?.emailAddress,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
      userRole: 'investor',
      action: 'submit',
      entityType: 'investor_agreement',
      entityId: agreement.id,
      description: 'Investor signed agreement in portal',
      metadata: {
        investor_id: agreement.investor_id,
        investor_signed_name: agreement.investor_signed_name,
        investor_signed_at: agreement.investor_signed_at,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error signing investor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sign agreement' },
      { status: 500 }
    );
  }
}
