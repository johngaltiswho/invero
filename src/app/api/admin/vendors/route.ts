import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch all vendors across all contractors (admin use)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .select('id, name, contact_person, email, phone, gst_number, contractor_id')
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch vendors:', error);
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}
