import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { voidAgreement } from '@/lib/agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const agreement = await voidAgreement(
      id,
      {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
      typeof body.reason === 'string' ? body.reason.trim() : undefined
    );

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'void',
      entityType: 'investor_agreement',
      entityId: agreement.id,
      description: 'Voided investor agreement',
      metadata: {
        investor_id: agreement.investor_id,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error voiding agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to void agreement' },
      { status: 500 }
    );
  }
}
