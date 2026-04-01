import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordSmeFuelPayment } from '@/lib/fuel/finance';

const schema = z.object({
  contractor_id: z.string().uuid(),
  amount: z.number().positive().max(10000000),
  notes: z.string().max(500).trim().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }

    const entry = await recordSmeFuelPayment({
      contractorId: parsed.data.contractor_id,
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    });
    return NextResponse.json({
      success: true,
      data: entry,
      message: 'SME fuel payment recorded successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/fuel-finance/sme-payments:', error);
    return NextResponse.json({ error: 'Failed to record SME payment' }, { status: 500 });
  }
}
