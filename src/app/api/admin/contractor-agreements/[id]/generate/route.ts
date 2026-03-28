import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { regenerateContractorAgreementDraft } from '@/lib/contractor-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

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
      action: 'generate',
      entityType: 'contractor_agreement',
      entityId: agreement.id,
      description: 'Generated contractor agreement draft PDF',
      metadata: {
        contractor_id: agreement.contractor_id,
        agreement_type: agreement.agreement_type,
        draft_pdf_path: agreement.draft_pdf_path,
        template_version: agreement.template_version,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error generating contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate contractor agreement' },
      { status: 500 }
    );
  }
}
