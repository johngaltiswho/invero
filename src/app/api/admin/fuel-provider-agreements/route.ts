import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createFuelProviderAgreement, listFuelProviderAgreements } from '@/lib/fuel-provider-agreements/service';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const pumpId = request.nextUrl.searchParams.get('pump_id') || undefined;
    const agreements = await listFuelProviderAgreements(pumpId);
    return NextResponse.json({ success: true, agreements });
  } catch (error) {
    console.error('Error loading fuel provider agreements:', error);
    return NextResponse.json({ error: 'Failed to load fuel provider agreements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const body = await request.json();
    const agreement = await createFuelProviderAgreement({
      pumpId: body.pump_id,
      agreementDate: String(body.agreement_date || new Date().toISOString().slice(0, 10)),
      companySignatoryName: String(body.company_signatory_name || '').trim(),
      companySignatoryTitle: String(body.company_signatory_title || '').trim(),
      notes: typeof body.notes === 'string' ? body.notes.trim() : null,
      actor: {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
    });
    return NextResponse.json({ success: true, agreement }, { status: 201 });
  } catch (error) {
    console.error('Error creating fuel provider agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create fuel provider agreement' },
      { status: 500 }
    );
  }
}
