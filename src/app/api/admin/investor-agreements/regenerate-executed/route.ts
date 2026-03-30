import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requireAdmin } from '@/lib/admin-auth';
import { createAuditLog, getRequestContext } from '@/lib/audit';
import { bulkRegenerateExecutedInvestorAgreements } from '@/lib/agreements/service';
import type { LenderSleeveModelType } from '@/lib/lender-sleeves';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();
    const body = await request.json().catch(() => ({}));

    const summary = await bulkRegenerateExecutedInvestorAgreements(
      {
        id: adminUser?.id || 'system',
        email: adminUser?.email,
        name: adminUser?.name,
      },
      {
        investorId: typeof body.investor_id === 'string' && body.investor_id.trim() ? body.investor_id.trim() : undefined,
        agreementModelType:
          typeof body.agreement_model_type === 'string' && body.agreement_model_type.trim()
            ? (body.agreement_model_type.trim() as LenderSleeveModelType)
            : undefined,
      }
    );

    await createAuditLog({
      userId: adminUser?.id || 'system',
      userEmail: adminUser?.email,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'generate',
      entityType: 'investor_agreement',
      entityId: 'bulk-regenerate-executed',
      description: 'Regenerated executed investor agreement copies',
      metadata: {
        investor_id: body.investor_id || null,
        agreement_model_type: body.agreement_model_type || null,
        total: summary.total,
        regenerated: summary.regenerated,
        failed_count: summary.failed.length,
        failed: summary.failed,
      },
      ...getRequestContext(request),
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error bulk-regenerating executed investor agreements:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate executed investor agreements' },
      { status: 500 }
    );
  }
}
