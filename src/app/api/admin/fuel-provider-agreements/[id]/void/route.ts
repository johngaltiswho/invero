import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { voidFuelProviderAgreement } from '@/lib/fuel-provider-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const agreement = await voidFuelProviderAgreement(
      id,
      {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
      typeof body.reason === 'string' ? body.reason : null
    );
    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error voiding fuel provider agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to void fuel provider agreement' },
      { status: 500 }
    );
  }
}
