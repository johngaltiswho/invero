import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function resolveContractorId(userId: string): Promise<string | null> {
  const supabase = serviceClient();
  const { data } = await supabase
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return data?.id ?? null;
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const contractorId = await resolveContractorId(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('contractor_material_limits')
      .select(`
        id,
        contractor_id,
        material_id,
        monthly_usage_qty,
        notes,
        updated_at,
        material:materials!contractor_material_limits_material_id_fkey(
          id,
          name,
          unit,
          hsn_code
        )
      `)
      .eq('contractor_id', contractorId)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch material limits' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('GET contractor material limits error:', error);
    return NextResponse.json({ error: 'Failed to fetch material limits' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const contractorId = await resolveContractorId(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const body = await request.json();
    const materialId = String(body?.material_id || '').trim();
    const monthlyUsageQty = Number(body?.monthly_usage_qty);
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!materialId || !Number.isFinite(monthlyUsageQty) || monthlyUsageQty <= 0) {
      return NextResponse.json(
        { error: 'material_id and monthly_usage_qty (> 0) are required' },
        { status: 400 }
      );
    }

    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('contractor_material_limits')
      .upsert(
        {
          contractor_id: contractorId,
          material_id: materialId,
          monthly_usage_qty: monthlyUsageQty,
          notes,
          updated_by: contractorId
        },
        {
          onConflict: 'contractor_id,material_id'
        }
      )
      .select(`
        id,
        contractor_id,
        material_id,
        monthly_usage_qty,
        notes,
        updated_at,
        material:materials!contractor_material_limits_material_id_fkey(
          id,
          name,
          unit,
          hsn_code
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to save material limit' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PUT contractor material limits error:', error);
    return NextResponse.json({ error: 'Failed to save material limit' }, { status: 500 });
  }
}

