import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { bulkRegenerateExecutedContractorAgreements } from '@/lib/contractor-agreements/service';
import type { ContractorAgreementType } from '@/lib/contractor-agreements/types';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const body = await request.json().catch(() => ({}));

    const summary = await bulkRegenerateExecutedContractorAgreements(
      {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
      {
        contractorId: typeof body.contractor_id === 'string' && body.contractor_id.trim() ? body.contractor_id.trim() : undefined,
        agreementType:
          typeof body.agreement_type === 'string' && body.agreement_type.trim()
            ? (body.agreement_type.trim() as ContractorAgreementType)
            : undefined,
      }
    );

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'generate',
      entityType: 'contractor_agreement',
      entityId: 'bulk-regenerate-executed',
      description: 'Regenerated executed contractor agreement copies',
      metadata: {
        contractor_id: body.contractor_id || null,
        agreement_type: body.agreement_type || null,
        total: summary.total,
        regenerated: summary.regenerated,
        failed_count: summary.failed.length,
        failed: summary.failed,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error bulk-regenerating executed contractor agreements:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate executed contractor agreements' },
      { status: 500 }
    );
  }
}
