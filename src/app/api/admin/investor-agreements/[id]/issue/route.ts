import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { issueAgreement } from '@/lib/agreements/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const { id } = await params;
    const agreement = await issueAgreement(id, {
      id: adminUser?.id || 'system',
      email: adminUser?.email,
      name: adminUser?.name,
    });

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'issue',
      entityType: 'investor_agreement',
      entityId: agreement.id,
      description: 'Issued investor agreement',
      metadata: {
        investor_id: agreement.investor_id,
        issued_at: agreement.issued_at,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error('Error issuing agreement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to issue agreement' },
      { status: 500 }
    );
  }
}
