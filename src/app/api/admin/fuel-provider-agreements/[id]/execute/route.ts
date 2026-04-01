import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { markFuelProviderAgreementExecuted } from '@/lib/fuel-provider-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const agreement = await markFuelProviderAgreementExecuted(id, {
      id: adminUser?.id || 'system',
      email: adminUser?.email,
      name: adminUser?.name,
    });
    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error executing fuel provider agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute fuel provider agreement' },
      { status: 500 }
    );
  }
}
