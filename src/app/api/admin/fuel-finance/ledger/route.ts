import { NextRequest, NextResponse } from 'next/server';
import { getFuelLedger } from '@/lib/fuel/finance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractor_id') || undefined;
    const pumpId = searchParams.get('pump_id') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    const data = await getFuelLedger({
      contractorId,
      pumpId,
      limit,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/fuel-finance/ledger:', error);
    return NextResponse.json({ error: 'Failed to load fuel ledger' }, { status: 500 });
  }
}
