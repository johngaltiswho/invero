import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { createAgreementSignedUrl, getInvestorAgreement, listAgreementDeliveryLogs, regenerateAgreementDraft } from '@/lib/agreements/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const agreement = await getInvestorAgreement(id);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const deliveryLogs = await listAgreementDeliveryLogs(id);
    return NextResponse.json({
      success: true,
      agreement,
      deliveryLogs,
      files: {
        draft_url: await createAgreementSignedUrl(agreement.draft_pdf_path || null),
        signed_url: await createAgreementSignedUrl(agreement.signed_pdf_path || null),
        executed_url: await createAgreementSignedUrl(agreement.executed_pdf_path || null),
      },
    });
  } catch (error) {
    console.error('Error loading investor agreement:', error);
    return NextResponse.json({ error: 'Failed to load investor agreement' }, { status: 500 });
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

    const agreement = await regenerateAgreementDraft(
      id,
      {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
      {
        commitment_amount: body.commitment_amount !== undefined ? Number(body.commitment_amount) : undefined,
        agreement_date: body.agreement_date,
        investor_pan: typeof body.investor_pan === 'string' ? body.investor_pan.trim().toUpperCase() : undefined,
        investor_address: typeof body.investor_address === 'string' ? body.investor_address.trim() : undefined,
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
      entityType: 'investor_agreement',
      entityId: agreement.id,
      newValues: agreement as any,
      description: 'Updated investor agreement draft',
      metadata: {
        investor_id: agreement.investor_id,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error updating investor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agreement' },
      { status: 500 }
    );
  }
}
