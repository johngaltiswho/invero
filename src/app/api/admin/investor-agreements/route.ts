import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { createInvestorAgreement, listInvestorAgreements } from '@/lib/agreements/service';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const investorId = searchParams.get('investor_id') || undefined;
    const lenderSleeveId = searchParams.get('lender_sleeve_id') || undefined;

    const agreements = await listInvestorAgreements(investorId, lenderSleeveId);
    return NextResponse.json({ success: true, agreements });
  } catch (error) {
    console.error('Error loading investor agreements:', error);
    return NextResponse.json({ error: 'Failed to load investor agreements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const body = await request.json();

    const agreement = await createInvestorAgreement({
      investorId: body.investor_id,
      lenderSleeveId: typeof body.lender_sleeve_id === 'string' ? body.lender_sleeve_id : null,
      agreementModelType: body.agreement_model_type === 'fixed_debt' ? 'fixed_debt' : 'pool_participation',
      commitmentAmount: Number(body.commitment_amount ?? 100000),
      agreementDate: String(body.agreement_date || new Date().toISOString().slice(0, 10)),
      investorPan: typeof body.investor_pan === 'string' ? body.investor_pan.trim().toUpperCase() : null,
      investorAddress: typeof body.investor_address === 'string' ? body.investor_address.trim() : null,
      companySignatoryName: String(body.company_signatory_name || '').trim(),
      companySignatoryTitle: String(body.company_signatory_title || '').trim(),
      notes: typeof body.notes === 'string' ? body.notes.trim() : null,
      actor: {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
    });

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'create',
      entityType: 'investor_agreement',
      entityId: agreement.id,
      newValues: agreement as any,
      description: 'Created investor agreement draft',
      metadata: {
        investor_id: agreement.investor_id,
        commitment_amount: agreement.commitment_amount,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement }, { status: 201 });
  } catch (error) {
    console.error('Error creating investor agreement:', error);
    const message = error instanceof Error ? error.message : 'Failed to create investor agreement';
    const status =
      message.includes('Cannot replace the current agreement after funding activity has started') ||
      message.includes('Cannot replace the current agreement while a payment submission exists for it')
        ? 409
        : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
