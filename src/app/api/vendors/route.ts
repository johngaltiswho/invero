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
        details: error.message 
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