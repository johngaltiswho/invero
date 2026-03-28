import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import {
  createContractorAgreementSignedUrl,
  getContractorAgreement,
  listContractorAgreementDeliveryLogs,
  regenerateContractorAgreementDraft,
} from '@/lib/contractor-agreements/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const agreement = await getContractorAgreement(id);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const deliveryLogs = await listContractorAgreementDeliveryLogs(id);
    return NextResponse.json({
      success: true,
      agreement,
      deliveryLogs,
      files: {
        draft_url: await createContractorAgreementSignedUrl(agreement.draft_pdf_path || null),
        signed_url: await createContractorAgreementSignedUrl(agreement.signed_pdf_path || null),
        executed_url: await createContractorAgreementSignedUrl(agreement.executed_pdf_path || null),
      },
    });
  } catch (error) {
    console.error('Error loading contractor agreement:', error);
    return NextResponse.json({ error: 'Failed to load contractor agreement' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const body = await request.json();

    const agreement = await regenerateContractorAgreementDraft(
      id,
      {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
      {
        agreement_date: body.agreement_date,
        company_signatory_name: body.company_signatory_name,
        company_signatory_title: body.company_signatory_title,
        notes: body.notes,
      }
    );

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'update',
      entityType: 'contractor_agreement',
      entityId: agreement.id,
      newValues: agreement as any,
      description: 'Updated contractor agreement draft',
      metadata: {
        contractor_id: agreement.contractor_id,
        agreement_type: agreement.agreement_type,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error updating contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update contractor agreement' },
      { status: 500 }
    );
  }
}
