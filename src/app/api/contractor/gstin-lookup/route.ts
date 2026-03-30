import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { parseGstin } from '@/lib/gstin';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const gstin = typeof body?.gstin === 'string' ? body.gstin : '';
    const parsed = parseGstin(gstin);

    if (!parsed) {
      return NextResponse.json({ success: false, error: 'Invalid GSTIN format' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        gstin: parsed.normalized,
        pan: parsed.pan,
        stateCode: parsed.stateCode,
        stateName: parsed.stateName,
        source: 'parsed_from_gstin',
        note: 'PAN and state are derived directly from GSTIN format. Full legal name and registered address will require a GST data provider integration.'
      }
    });
  } catch (error) {
    console.error('Error in POST /api/contractor/gstin-lookup:', error);
    return NextResponse.json({ success: false, error: 'Failed to process GSTIN lookup' }, { status: 500 });
  }
}
