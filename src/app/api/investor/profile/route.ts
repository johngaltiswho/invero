import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getInvestorAuthErrorStatus, resolveActiveInvestor } from '@/lib/investor-auth';

type InvestorProfilePayload = {
  name?: string;
  phone?: string;
  pan_number?: string;
  address?: string;
};

function sanitizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    const { investor } = await resolveActiveInvestor();
    return NextResponse.json({
      success: true,
      data: {
        id: investor.id,
        email: investor.email ?? '',
        name: investor.name ?? '',
        investor_type: investor.investor_type ?? '',
        phone: investor.phone ?? '',
        pan_number: investor.pan_number ?? '',
        address: investor.address ?? '',
        agreement_status: investor.agreement_status ?? 'not_started',
        activation_status: investor.activation_status ?? 'inactive',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/investor/profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: getInvestorAuthErrorStatus(error) }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { investor } = await resolveActiveInvestor();
    const body = (await request.json()) as InvestorProfilePayload;

    const name = sanitizeOptionalString(body.name);
    const phone = sanitizeOptionalString(body.phone);
    const panNumber = sanitizeOptionalString(body.pan_number)?.toUpperCase() ?? null;
    const address = sanitizeOptionalString(body.address);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('investors')
      .update({
        name,
        phone,
        pan_number: panNumber,
        address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', investor.id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error updating investor profile:', error);
      return NextResponse.json({ error: 'Failed to update investor profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        email: data.email ?? '',
        name: data.name ?? '',
        investor_type: data.investor_type ?? '',
        phone: data.phone ?? '',
        pan_number: data.pan_number ?? '',
        address: data.address ?? '',
        agreement_status: data.agreement_status ?? 'not_started',
        activation_status: data.activation_status ?? 'inactive',
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/investor/profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: getInvestorAuthErrorStatus(error) }
    );
  }
}
