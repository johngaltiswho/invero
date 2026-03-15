import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { markAgreementExecuted, uploadAgreementFile } from '@/lib/agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (file) {
      await uploadAgreementFile({
        agreementId: id,
        file,
        kind: 'executed',
        actor: {
          id: adminUser?.id || 'system',
          email: adminUser?.email,
          name: adminUser?.name,
        },
      });
    }

    const agreement = await markAgreementExecuted(id, {
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
      entityType: 'investor_agreement',
      entityId: agreement.id,
      description: 'Marked investor agreement executed',
      metadata: {
        investor_id: agreement.investor_id,
        executed_pdf_path: agreement.executed_pdf_path,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error executing agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute agreement' },
      { status: 500 }
    );
  }
}
