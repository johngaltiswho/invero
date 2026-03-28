import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { signContractorAgreement } from '@/lib/contractor-agreements/service';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const agreement = await signContractorAgreement({
      agreementId: String(body.agreement_id || ''),
      typedName: String(body.typed_name || ''),
      confirmAgreement: Boolean(body.confirm_agreement),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    await createAuditLog({
      userId: user.id,
      userEmail: user.emailAddresses[0]?.emailAddress,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
      userRole: 'contractor',
      action: 'submit',
      entityType: 'contractor_agreement',
      entityId: agreement.id,
      description: 'Contractor signed agreement in portal',
      metadata: {
        contractor_id: agreement.contractor_id,
        agreement_type: agreement.agreement_type,
        contractor_signed_name: agreement.contractor_signed_name,
        contractor_signed_at: agreement.contractor_signed_at,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error signing contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sign agreement' },
      { status: 500 }
    );
  }
}
