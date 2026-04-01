import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { regenerateFuelProviderAgreementDraft } from '@/lib/fuel-provider-agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
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
    console.error('Error generating fuel provider agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate fuel provider agreement' },
      { status: 500 }
    );
  }
}
