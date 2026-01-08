import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch saved BOQ takeoffs for a project
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
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
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

    // Fetch BOQ takeoffs
    let query = supabase
      .from('boq_takeoffs')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractor.id);
    
    // Filter by file name if provided
    if (fileName) {
      query = query.eq('file_name', fileName);
    }
    
    const { data: takeoffs, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch BOQ takeoffs:', error);
      
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST205') {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'BOQ takeoffs table not found. No saved takeoffs available.'
        });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch BOQ takeoffs',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: takeoffs || []
    });

  } catch (error) {
    console.error('Error fetching BOQ takeoffs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch BOQ takeoffs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Save BOQ takeoff
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      file_name,
      file_url,
      takeoff_data,
      total_items
    } = body;

    if (!project_id || !file_name || !takeoff_data) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, file_name, takeoff_data' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Save BOQ takeoff
    const { data: savedTakeoff, error: insertError } = await supabase
      .from('boq_takeoffs')
      .insert({
        project_id,
        contractor_id: contractor.id,
        file_name,
        file_url,
        takeoff_data: JSON.stringify(takeoff_data),
        total_items: total_items || takeoff_data.length
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save BOQ takeoff:', insertError);
      
      // If table doesn't exist, provide helpful error message
      if (insertError.code === 'PGRST205') {
        return NextResponse.json({ 
          error: 'Database table not found. Please create the boq_takeoffs table using the SQL schema file.',
          details: 'Run boq-takeoffs-schema.sql in Supabase SQL editor'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to save BOQ takeoff',
        details: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: savedTakeoff
    });

  } catch (error) {
    console.error('Error saving BOQ takeoff:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save BOQ takeoff',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update existing BOQ takeoff
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const takeoffId = searchParams.get('id');

    if (!takeoffId) {
      return NextResponse.json({ error: 'Takeoff ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      takeoff_data,
      total_items
    } = body;

    if (!takeoff_data) {
      return NextResponse.json({ 
        error: 'Missing required field: takeoff_data' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Update BOQ takeoff
    const { data: updatedTakeoff, error: updateError } = await supabase
      .from('boq_takeoffs')
      .update({
        takeoff_data: JSON.stringify(takeoff_data),
        total_items: total_items || takeoff_data.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', takeoffId)
      .eq('contractor_id', contractor.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update BOQ takeoff:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update BOQ takeoff',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedTakeoff
    });

  } catch (error) {
    console.error('Error updating BOQ takeoff:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update BOQ takeoff',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}