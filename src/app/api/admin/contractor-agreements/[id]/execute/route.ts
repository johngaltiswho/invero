import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { markContractorAgreementExecuted } from '@/lib/contractor-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const agreement = await markContractorAgreementExecuted(id, {
      id: adminUser?.id || 'system',
      email: adminUser?.email,
      name: adminUser?.name,
    });

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'execute',
      entityType: 'contractor_agreement',
      entityId: agreement.id,
      description: 'Executed contractor agreement',
      metadata: {
        contractor_id: agreement.contractor_id,
        agreement_type: agreement.agreement_type,
        executed_pdf_path: agreement.executed_pdf_path,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error executing contractor agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute contractor agreement' },
      { status: 500 }
    );
  }
}
