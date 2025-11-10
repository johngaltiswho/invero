import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get contractor_id from query params (passed from frontend)
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractor_id');

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID required' }, { status: 400 });
    }

    // Get clients for this contractor
    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error('Error in clients GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get data from request body
    const body = await request.json();
    const { contractor_id, name, contact_person, email, phone, address, company_type, gst_number, pan_number, notes } = body;

    if (!contractor_id) {
      return NextResponse.json({ error: 'Contractor ID required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    // Create new client
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .insert({
        contractor_id,
        name,
        contact_person,
        email,
        phone,
        address,
        company_type,
        gst_number,
        pan_number,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('Error in clients POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, contact_person, email, phone, address, company_type, gst_number, pan_number, notes, status } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Client ID and name are required' }, { status: 400 });
    }

    // Update client
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .update({
        name,
        contact_person,
        email,
        phone,
        address,
        company_type,
        gst_number,
        pan_number,
        notes,
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('Error in clients PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}