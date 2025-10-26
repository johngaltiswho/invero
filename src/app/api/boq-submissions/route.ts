import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/boq-submissions - Get BOQ submission for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const contractorId = searchParams.get('contractor_id');

    if (!projectId || !contractorId) {
      return NextResponse.json(
        { error: 'project_id and contractor_id are required' },
        { status: 400 }
      );
    }

    // Get the latest submission for this project
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('boq_submissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (submissionError && submissionError.code !== 'PGRST116') {
      console.error('Database error:', submissionError);
      return NextResponse.json(
        { error: 'Failed to fetch BOQ submission' },
        { status: 500 }
      );
    }

    let takeoffs = [];
    if (submission) {
      // Get takeoffs for this submission
      const { data: takeoffData, error: takeoffError } = await supabaseAdmin
        .from('quantity_takeoffs')
        .select('*')
        .eq('boq_submission_id', submission.id)
        .order('created_at', { ascending: true });

      if (takeoffError) {
        console.error('Database error:', takeoffError);
        return NextResponse.json(
          { error: 'Failed to fetch quantity takeoffs' },
          { status: 500 }
        );
      }

      takeoffs = takeoffData || [];
    }

    return NextResponse.json({
      submission,
      takeoffs
    });
  } catch (error) {
    console.error('Error fetching BOQ submission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BOQ submission' },
      { status: 500 }
    );
  }
}

// POST /api/boq-submissions - Create a new BOQ submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, contractor_id, submission_type = 'initial' } = body;

    if (!project_id || !contractor_id) {
      return NextResponse.json(
        { error: 'project_id and contractor_id are required' },
        { status: 400 }
      );
    }

    // Create new submission
    const { data: submission, error } = await supabaseAdmin
      .from('boq_submissions')
      .insert([
        {
          project_id,
          contractor_id,
          submission_type,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create BOQ submission' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { submission, message: 'BOQ submission created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating BOQ submission:', error);
    return NextResponse.json(
      { error: 'Failed to create BOQ submission' },
      { status: 500 }
    );
  }
}