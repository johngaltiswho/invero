import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminUser } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('investors')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Investor not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching investor:', error);
      return NextResponse.json(
        { error: 'Failed to fetch investor' },
        { status: 500 }
      );
    }

    return NextResponse.json({ investor: data });

  } catch (error) {
    console.error('Error in GET /api/admin/investors/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const adminUser = await getAdminUser();

    const body = await request.json();
    const { email, name, investor_type, phone, status, notes } = body;

    // Validate required fields
    if (!email || !name || !investor_type) {
      return NextResponse.json(
        { error: 'Email, name, and investor type are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate investor type
    const validTypes = ['Individual', 'HNI', 'Family Office', 'Institutional'];
    if (!validTypes.includes(investor_type)) {
      return NextResponse.json(
        { error: 'Invalid investor type' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'active', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: any = {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      investor_type,
      phone: phone?.trim(),
      notes: notes?.trim(),
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
    }

    const { data, error } = await supabase
      .from('investors')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Investor not found' },
          { status: 404 }
        );
      }
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'An investor with this email already exists' },
          { status: 409 }
        );
      }
      console.error('Error updating investor:', error);
      return NextResponse.json(
        { error: 'Failed to update investor' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Investor updated successfully',
      investor: data
    });

  } catch (error) {
    console.error('Error in PUT /api/admin/investors/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { error } = await supabase
      .from('investors')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting investor:', error);
      return NextResponse.json(
        { error: 'Failed to delete investor' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Investor deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/investors/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}