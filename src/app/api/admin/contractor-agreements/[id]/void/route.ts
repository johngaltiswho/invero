import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { voidContractorAgreement } from '@/lib/contractor-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const agreement = await voidContractorAgreement(id, {
      id: adminUser?.id || 'system',
      email: adminUser?.email,
      name: adminUser?.name,
    }, typeof body.reason === 'string' ? body.reason.trim() : undefined);

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'void',
      entityType: 'contractor_agreement',
      entityId: agreement.id,
      description: 'Voided contractor agreement',
      metadata: {
        contractor_id: agreement.contractor_id,
        agreement_type: agreement.agreement_type,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error voiding contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to void contractor agreement' },
      { status: 500 }
    );
  }
}
