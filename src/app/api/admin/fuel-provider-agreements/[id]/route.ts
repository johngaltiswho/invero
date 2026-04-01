import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import {
  createFuelProviderAgreementSignedUrl,
  getFuelProviderAgreement,
  listFuelProviderAgreementDeliveryLogs,
  regenerateFuelProviderAgreementDraft,
} from '@/lib/fuel-provider-agreements/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const agreement = await getFuelProviderAgreement(id);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const deliveryLogs = await listFuelProviderAgreementDeliveryLogs(id);
    return NextResponse.json({
      success: true,
      agreement,
      deliveryLogs,
      files: {
        draft_url: await createFuelProviderAgreementSignedUrl(agreement.draft_pdf_path || null),
        signed_url: await createFuelProviderAgreementSignedUrl(agreement.signed_pdf_path || null),
        executed_url: await createFuelProviderAgreementSignedUrl(agreement.executed_pdf_path || null),
      },
    });
  } catch (error) {
    console.error('Error loading fuel provider agreement:', error);
    return NextResponse.json({ error: 'Failed to load fuel provider agreement' }, { status: 500 });
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

    const agreement = await regenerateFuelProviderAgreementDraft(
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

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error updating fuel provider agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update fuel provider agreement' },
      { status: 500 }
    );
  }
}
