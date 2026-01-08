import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/boq-submissions/[id]/submit - Submit BOQ for verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submissionId = id;

    // Update submission status to under_review
    const { data: submission, error } = await supabaseAdmin
      .from('boq_submissions')
      .update({
        status: 'under_review',
        submitted_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('status', 'pending') // Only allow submission if currently pending
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Submission not found or already submitted' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to submit BOQ for verification' },
        { status: 500 }
      );
    }

    // Calculate total estimated value from takeoffs
    const { data: takeoffs, error: takeoffError } = await supabaseAdmin
      .from('quantity_takeoffs')
      .select('estimated_amount')
      .eq('boq_submission_id', submissionId);

    if (!takeoffError && takeoffs) {
      const totalValue = takeoffs.reduce((sum: number, takeoff: any) => sum + (takeoff.estimated_amount || 0), 0);
      const totalCount = takeoffs.length;

      // Update submission with calculated totals
      await supabaseAdmin
        .from('boq_submissions')
        .update({
          total_estimated_value: totalValue,
          total_materials_count: totalCount
        })
        .eq('id', submissionId);
    }

    return NextResponse.json({
      submission,
      message: 'BOQ submitted for verification successfully'
    });
  } catch (error) {
    console.error('Error submitting BOQ:', error);
    return NextResponse.json(
      { error: 'Failed to submit BOQ for verification' },
      { status: 500 }
    );
  }
}