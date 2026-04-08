import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { generateProjectParticipationFeeInvoiceForRepaidRequest } from '@/lib/invoice-service';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const purchaseRequestId = body?.purchase_request_id;
    const invoiceKind = body?.invoice_kind;
    const forceRegenerate = body?.force_regenerate === true;

    if (!purchaseRequestId) {
      return NextResponse.json({ error: 'purchase_request_id is required' }, { status: 400 });
    }

    if (invoiceKind !== 'repayment_fee') {
      return NextResponse.json({ error: 'Unsupported fee invoice kind' }, { status: 400 });
    }

    const result = await generateProjectParticipationFeeInvoiceForRepaidRequest({
      purchaseRequestId,
      forceRegenerate,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }
    }

    console.error('Admin project participation fee invoice generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
