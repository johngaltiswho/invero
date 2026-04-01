import { NextResponse } from 'next/server';
import { getFuelFinanceOverview } from '@/lib/fuel/finance';

export async function GET() {
  try {
    const overview = await getFuelFinanceOverview();
    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/fuel-finance/overview:', error);
    return NextResponse.json({ error: 'Failed to load fuel finance overview' }, { status: 500 });
  }
}
