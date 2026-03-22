import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

/**
 * Validation schema for creating a fuel pump
 */
const createPumpSchema = z.object({
  pump_name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  pincode: z.string().max(10).optional(),
  contact_person: z.string().max(100).optional(),
  contact_phone: z.string().max(15).optional(),
  contact_email: z.string().email().max(100).optional(),
});

/**
 * GET /api/admin/fuel-pumps
 * List all fuel pumps
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');

    let query = supabaseAdmin
      .from('fuel_pumps')
      .select('*')
      .order('pump_name', { ascending: true });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: pumps, error } = await query;

    if (error) {
      console.error('Failed to fetch fuel pumps:', error);
      return NextResponse.json(
        { error: 'Failed to load fuel pumps' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pumps || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/fuel-pumps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/fuel-pumps
 * Create a new fuel pump
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createPumpSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { data: newPump, error } = await supabaseAdmin
      .from('fuel_pumps')
      .insert(validationResult.data)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create fuel pump:', error);
      return NextResponse.json(
        { error: 'Failed to create fuel pump' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newPump,
      message: 'Fuel pump created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/fuel-pumps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
