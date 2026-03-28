import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { createContractorAgreement, listContractorAgreements } from '@/lib/contractor-agreements/service';
import type { ContractorAgreementType } from '@/lib/contractor-agreements/types';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractor_id') || undefined;
    const agreementType = (searchParams.get('agreement_type') || undefined) as ContractorAgreementType | undefined;

    const agreements = await listContractorAgreements(contractorId, agreementType);
    return NextResponse.json({ success: true, agreements });
  } catch (error) {
    console.error('Error loading contractor agreements:', error);
    return NextResponse.json({ error: 'Failed to load contractor agreements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const body = await request.json();

    const agreement = await createContractorAgreement({
      contractorId: body.contractor_id,
      agreementType: body.agreement_type,
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

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'create',
      entityType: 'contractor_agreement',
      entityId: agreement.id,
      newValues: agreement as any,
      description: 'Created contractor agreement draft',
      metadata: {
        contractor_id: agreement.contractor_id,
        agreement_type: agreement.agreement_type,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement }, { status: 201 });
  } catch (error) {
    console.error('Error creating contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create contractor agreement' },
      { status: 500 }
    );
  }
}
