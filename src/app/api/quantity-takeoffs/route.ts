import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/quantity-takeoffs - Create a new quantity takeoff
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      boq_submission_id,
      material_category,
      material_specification,
      material_unit,
      drawing_reference,
      drawing_sheet_number,
      quantity_from_drawings,
      estimated_rate,
      estimated_amount
    } = body;

    // Validate required fields
    if (!boq_submission_id || !material_category || !material_specification || !material_unit || !quantity_from_drawings) {
      return NextResponse.json(
        { error: 'Required fields: boq_submission_id, material_category, material_specification, material_unit, quantity_from_drawings' },
        { status: 400 }
      );
    }

    // Verify that the BOQ submission exists and is in pending status
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('boq_submissions')
      .select('status')
      .eq('id', boq_submission_id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'BOQ submission not found' },
        { status: 404 }
      );
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot add takeoffs to a submitted BOQ' },
        { status: 400 }
      );
    }

    // Create the takeoff
    const { data: takeoff, error } = await supabaseAdmin
      .from('quantity_takeoffs')
      .insert([
        {
          boq_submission_id,
          material_category,
          material_specification,
          material_unit,
          drawing_reference,
          drawing_sheet_number,
          quantity_from_drawings,
          estimated_rate: estimated_rate || 0,
          estimated_amount: estimated_amount || 0,
          verification_status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create quantity takeoff' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { takeoff, message: 'Quantity takeoff created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating quantity takeoff:', error);
    return NextResponse.json(
      { error: 'Failed to create quantity takeoff' },
      { status: 500 }
    );
  }
}

// GET /api/quantity-takeoffs - Get takeoffs for a submission
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('boq_submission_id');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'boq_submission_id is required' },
        { status: 400 }
      );
    }

    const { data: takeoffs, error } = await supabaseAdmin
      .from('quantity_takeoffs')
      .select('*')
      .eq('boq_submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quantity takeoffs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ takeoffs });
  } catch (error) {
    console.error('Error fetching quantity takeoffs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quantity takeoffs' },
      { status: 500 }
    );
  }
}