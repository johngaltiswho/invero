import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { sendContractorAgreementEmail } from '@/lib/contractor-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const deliveryLog = await sendContractorAgreementEmail(id, {
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
      entityType: 'contractor_agreement_delivery',
      entityId: deliveryLog.id,
      description: 'Sent contractor agreement email',
      metadata: {
        contractor_agreement_id: deliveryLog.contractor_agreement_id,
        recipient_email: deliveryLog.recipient_email,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, deliveryLog });
  } catch (error) {
    console.error('Error sending contractor agreement email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send contractor agreement email' },
      { status: 500 }
    );
  }
}
