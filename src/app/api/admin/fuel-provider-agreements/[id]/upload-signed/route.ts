import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { uploadFuelProviderAgreementFile } from '@/lib/fuel-provider-agreements/service';

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
    const signerName = formData.get('signer_name');
    const signerEmail = formData.get('signer_email');

    if (!file) {
      return NextResponse.json({ error: 'Signed agreement file is required' }, { status: 400 });
    }

    const agreement = await uploadFuelProviderAgreementFile({
      agreementId: id,
      file,
      kind: 'signed',
      signerName: typeof signerName === 'string' ? signerName : null,
      signerEmail: typeof signerEmail === 'string' ? signerEmail : null,
      actor: {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error uploading fuel provider signed agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload signed agreement' },
      { status: 500 }
    );
  }
}
