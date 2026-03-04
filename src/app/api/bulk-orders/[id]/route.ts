import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const HSN_LOCKED_STATUSES = new Set(['invoiced', 'active_repayment', 'closed', 'defaulted']);

async function resolveContractorId(userId: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return contractor?.id ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const contractorId = await resolveContractorId(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('buyer_bulk_orders')
      .select(`
        *,
        material:materials!buyer_bulk_orders_material_id_fkey(
          id,
          name,
          hsn_code,
          unit
        )
      `)
      .eq('id', id)
      .eq('contractor_id', contractorId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching bulk order:', error);
    return NextResponse.json({ error: 'Failed to fetch bulk order' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;
    const contractorId = await resolveContractorId(user.id);
    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingOrder, error: existingError } = await supabase
      .from('buyer_bulk_orders')
      .select('id, contractor_id, status, hsn_code')
      .eq('id', id)
      .eq('contractor_id', contractorId)
      .single();

    if (existingError || !existingOrder) {
      return NextResponse.json({ error: 'Bulk order not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (body?.hsn_code !== undefined) {
      if (HSN_LOCKED_STATUSES.has(existingOrder.status)) {
        return NextResponse.json(
          { error: `HSN code cannot be changed once order is ${existingOrder.status}` },
          { status: 400 }
        );
      }
      updateData.hsn_code = body.hsn_code ? String(body.hsn_code).trim() : null;
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'No valid fields supplied for update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('buyer_bulk_orders')
      .update(updateData)
      .eq('id', id)
      .eq('contractor_id', contractorId)
      .select(`
        *,
        material:materials!buyer_bulk_orders_material_id_fkey(
          id,
          name,
          hsn_code,
          unit
        )
      `)
      .single();

    if (error) {
      console.error('Failed to update bulk order:', error);
      return NextResponse.json(
        { error: 'Failed to update bulk order', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating bulk order:', error);
    return NextResponse.json({ error: 'Failed to update bulk order' }, { status: 500 });
  }
}
