import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch verified vendors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractor_id');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query - filter by contractor if specified
    let query = supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (contractorId) {
      query = query.eq('contractor_id', contractorId);
    }

    const { data: vendors, error } = await query;

    if (error) {
      console.error('Failed to fetch vendors:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch vendors',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    // Transform the data to match expected format for both use cases
    const transformedVendors = vendors?.map(vendor => ({
      ...vendor,
      contactPerson: vendor.contact_person, // Add camelCase alias
      gstNumber: vendor.gst_number, // Add camelCase alias
      createdAt: vendor.created_at, // Add camelCase alias
      updatedAt: vendor.updated_at // Add camelCase alias
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedVendors,
      vendors: transformedVendors // Network page expects this key
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch vendors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contractorId = body.contractor_id;
    const name = body.name?.trim();
    const phone = body.phone?.trim();

    if (!contractorId || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: contractor_id, name, phone' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: vendor, error } = await supabase
      .from('vendors')
      .insert({
        contractor_id: contractorId,
        name,
        contact_person: body.contactPerson || body.contact_person || null,
        phone,
        email: body.email || null,
        address: body.address || null,
        specialties: body.specialties || null,
        gst_number: body.gstNumber || body.gst_number || null
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create vendor:', error);
      return NextResponse.json(
        { error: 'Failed to create vendor', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vendor: {
        ...vendor,
        contactPerson: vendor.contact_person,
        gstNumber: vendor.gst_number,
        createdAt: vendor.created_at,
        updatedAt: vendor.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update vendor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const vendorId = body.id;
    const name = body.name?.trim();
    const phone = body.phone?.trim();

    if (!vendorId || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, phone' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: vendor, error } = await supabase
      .from('vendors')
      .update({
        name,
        contact_person: body.contactPerson || body.contact_person || null,
        phone,
        email: body.email || null,
        address: body.address || null,
        specialties: body.specialties || null,
        gst_number: body.gstNumber || body.gst_number || null
      })
      .eq('id', vendorId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update vendor:', error);
      return NextResponse.json(
        { error: 'Failed to update vendor', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vendor: {
        ...vendor,
        contactPerson: vendor.contact_person,
        gstNumber: vendor.gst_number,
        createdAt: vendor.created_at,
        updatedAt: vendor.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove vendor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('id');

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);

    if (error) {
      console.error('Failed to delete vendor:', error);
      return NextResponse.json(
        { error: 'Failed to delete vendor', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
