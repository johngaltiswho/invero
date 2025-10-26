import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

// POST /api/takeoff-verification - Submit BOQ takeoff for verification
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      file_name
    } = body;

    if (!project_id || !file_name) {
      return NextResponse.json(
        { error: 'project_id and file_name are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor to verify ownership
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Find the existing BOQ takeoff for this project and file
    console.log('Looking for takeoff with project_id:', project_id, 'file_name:', file_name, 'contractor_id:', contractor.id);
    
    const { data: existingTakeoff, error: findError } = await supabase
      .from('boq_takeoffs')
      .select('*')
      .eq('project_id', project_id)
      .eq('file_name', file_name)
      .eq('contractor_id', contractor.id)
      .single();

    console.log('Takeoff search result:', { existingTakeoff, findError });

    if (findError || !existingTakeoff) {
      // Let's also check if there are any takeoffs at all
      const { data: allTakeoffsInDb } = await supabase
        .from('boq_takeoffs')
        .select('file_name, project_id, id')
        .limit(10);
      
      // And check specific project takeoffs
      const { data: projectTakeoffs } = await supabase
        .from('boq_takeoffs')
        .select('file_name, project_id, id')
        .eq('project_id', project_id);
      
      console.log('All takeoffs in DB (first 10):', allTakeoffsInDb);
      console.log('Takeoffs for this specific project:', projectTakeoffs);
      
      return NextResponse.json(
        { 
          error: 'No BOQ takeoff found for this project and file. Please save your takeoff first.',
          debug: {
            searched_project_id: project_id,
            searched_file_name: file_name,
            all_takeoffs_sample: allTakeoffsInDb,
            project_takeoffs: projectTakeoffs,
            find_error: findError
          }
        },
        { status: 404 }
      );
    }

    // Update the takeoff to pending verification status
    const { data: updatedTakeoff, error: updateError } = await supabase
      .from('boq_takeoffs')
      .update({
        verification_status: 'pending',
        submitted_for_verification_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', (existingTakeoff as any).id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit takeoff for verification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTakeoff,
      message: 'BOQ takeoff submitted for verification successfully'
    });
  } catch (error) {
    console.error('Error submitting takeoff for verification:', error);
    return NextResponse.json(
      { error: 'Failed to submit takeoff for verification' },
      { status: 500 }
    );
  }
}

// GET /api/takeoff-verification - Get verification status for project/contractor
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const fileName = searchParams.get('file_name');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor to verify ownership
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    let query = supabase
      .from('boq_takeoffs')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractor.id);

    if (fileName) {
      query = query.eq('file_name', fileName);
    }

    const { data: takeoffs, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch BOQ takeoffs' },
        { status: 500 }
      );
    }

    // If we have a specific file, return its status
    if (fileName && takeoffs && takeoffs.length > 0) {
      const takeoff = takeoffs[0] as any;
      return NextResponse.json({
        success: true,
        data: {
          takeoff,
          overallStatus: takeoff.verification_status || 'none'
        }
      });
    }

    // Calculate verification summary for all takeoffs
    const summary = {
      total: takeoffs?.length || 0,
      none: takeoffs?.filter((item: any) => (item.verification_status || 'none') === 'none').length || 0,
      pending: takeoffs?.filter((item: any) => item.verification_status === 'pending').length || 0,
      verified: takeoffs?.filter((item: any) => item.verification_status === 'verified').length || 0,
      disputed: takeoffs?.filter((item: any) => item.verification_status === 'disputed').length || 0,
      revision_required: takeoffs?.filter((item: any) => item.verification_status === 'revision_required').length || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        takeoffs: takeoffs || [],
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching BOQ takeoffs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BOQ takeoffs' },
      { status: 500 }
    );
  }
}