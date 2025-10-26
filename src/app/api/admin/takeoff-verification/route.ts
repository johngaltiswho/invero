import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/takeoff-verification - Get all pending takeoff items for verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get BOQ takeoffs with contractor and project info
    const { data: takeoffs, error } = await supabaseAdmin
      .from('boq_takeoffs')
      .select(`
        *,
        contractors!boq_takeoffs_contractor_id_fkey (
          company_name,
          contact_person,
          email
        )
      `)
      .eq('verification_status', status)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch takeoff items' },
        { status: 500 }
      );
    }

    // Get summary stats
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('boq_takeoffs')
      .select('verification_status')
      .not('verification_status', 'is', null);

    let summary = {
      pending: 0,
      verified: 0,
      disputed: 0,
      revision_required: 0
    };

    if (!statsError && stats) {
      summary = stats.reduce((acc, item) => {
        acc[item.verification_status as keyof typeof acc] = (acc[item.verification_status as keyof typeof acc] || 0) + 1;
        return acc;
      }, summary);
    }

    return NextResponse.json({
      success: true,
      data: {
        takeoffs: takeoffs || [],
        summary,
        pagination: {
          limit,
          offset,
          total: takeoffs?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching takeoff items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch takeoff items' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/takeoff-verification - Verify a takeoff item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      takeoff_id,
      admin_verified_quantity,
      verification_status,
      admin_notes,
      verified_by, // admin user id
      estimated_rate
    } = body;

    if (!takeoff_id || !verification_status) {
      return NextResponse.json(
        { error: 'takeoff_id and verification_status are required' },
        { status: 400 }
      );
    }

    // Update the takeoff item
    const updateData: any = {
      verification_status,
      admin_notes,
      verified_by,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (admin_verified_quantity !== undefined) {
      updateData.admin_verified_quantity = admin_verified_quantity;
    }

    if (estimated_rate !== undefined) {
      updateData.estimated_rate = estimated_rate;
    }

    const { data: takeoff, error } = await supabaseAdmin
      .from('boq_takeoffs')
      .update(updateData)
      .eq('id', takeoff_id)
      .select(`
        *,
        contractors!boq_takeoffs_contractor_id_fkey (
          company_name,
          contact_person,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update takeoff item' },
        { status: 500 }
      );
    }

    // If verified, optionally export to project materials
    if (verification_status === 'verified') {
      // This could trigger automatic export to project_materials table
      // For now, we'll just mark it as funding eligible (handled by trigger)
    }

    return NextResponse.json({
      success: true,
      data: takeoff,
      message: `Takeoff item ${verification_status} successfully`
    });
  } catch (error) {
    console.error('Error updating takeoff item:', error);
    return NextResponse.json(
      { error: 'Failed to update takeoff item' },
      { status: 500 }
    );
  }
}

// POST /api/admin/takeoff-verification/bulk - Bulk verify multiple takeoffs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { takeoff_ids, verification_status, admin_notes, verified_by } = body;

    if (!takeoff_ids || !Array.isArray(takeoff_ids) || !verification_status) {
      return NextResponse.json(
        { error: 'takeoff_ids (array) and verification_status are required' },
        { status: 400 }
      );
    }

    const updateData = {
      verification_status,
      admin_notes,
      verified_by,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: takeoffs, error } = await supabaseAdmin
      .from('boq_takeoffs')
      .update(updateData)
      .in('id', takeoff_ids)
      .select('id, file_name, verification_status');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to bulk update takeoff items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: takeoffs,
      message: `${takeoffs?.length || 0} takeoff items ${verification_status} successfully`
    });
  } catch (error) {
    console.error('Error bulk updating takeoff items:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update takeoff items' },
      { status: 500 }
    );
  }
}