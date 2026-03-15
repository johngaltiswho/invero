import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { uploadAgreementFile } from '@/lib/agreements/service';

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

    if (!file) {
      return NextResponse.json({ error: 'Signed agreement file is required' }, { status: 400 });
    }

    const agreement = await uploadAgreementFile({
      agreementId: id,
      file,
      kind: 'signed',
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
      action: 'upload',
      entityType: 'investor_agreement',
      entityId: agreement.id,
      description: 'Uploaded investor-signed agreement copy',
      metadata: {
        investor_id: agreement.investor_id,
        signed_pdf_path: agreement.signed_pdf_path,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error uploading signed agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload signed agreement' },
      { status: 500 }
    );
  }
}
