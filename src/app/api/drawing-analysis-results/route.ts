import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileUrl, projectId, analysisResults, projectType, processingTime } = body;

    if (!fileName || !analysisResults) {
      return NextResponse.json({ 
        error: 'fileName and analysisResults are required' 
      }, { status: 400 });
    }

    // Save analysis results to database
    const { data, error } = await supabase
      .from('drawing_analysis_results')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        file_name: fileName,
        file_url: fileUrl,
        analysis_results: analysisResults,
        project_type: projectType,
        processing_time: processingTime,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to save analysis results',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const projectId = searchParams.get('projectId');

    if (!fileName) {
      return NextResponse.json({ 
        error: 'fileName parameter is required' 
      }, { status: 400 });
    }

    // Get the most recent analysis for this file
    let query = supabase
      .from('drawing_analysis_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('file_name', fileName)
      .order('created_at', { ascending: false })
      .limit(1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to retrieve analysis results',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data?.[0] || null
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}