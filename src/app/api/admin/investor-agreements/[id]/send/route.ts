import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { sendAgreementEmail } from '@/lib/agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const deliveryLog = await sendAgreementEmail(id, {
      id: adminUser?.id || 'system',
      email: adminUser?.email,
      name: adminUser?.name,
    });

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'send',
      entityType: 'agreement_delivery',
      entityId: deliveryLog.id,
      description: 'Sent investor agreement email',
      metadata: {
        investor_agreement_id: deliveryLog.investor_agreement_id,
        recipient_email: deliveryLog.recipient_email,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, deliveryLog });
  } catch (error) {
    console.error('Error sending agreement email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send agreement email' },
      { status: 500 }
    );
  }
}
