import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { sendFuelProviderAgreementEmail } from '@/lib/fuel-provider-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const deliveryLog = await sendFuelProviderAgreementEmail(id, {
      id: adminUser?.id || 'system',
      email: adminUser?.email,
      name: adminUser?.name,
    });
    return NextResponse.json({ success: true, deliveryLog });
  } catch (error) {
    console.error('Error sending fuel provider agreement email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send fuel provider agreement email' },
      { status: 500 }
    );
  }
}
