import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch master materials list
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const query = searchParams.get('q')?.trim();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // By default, exclude pending materials from the catalog.
    // Pending materials are visible only via /api/material-requests for the requesting contractor.
    const includePending = searchParams.get('include_pending') === 'true';

    let materialsQuery = supabase
      .from('materials')
      .select('id, name, category, unit, description, approval_status')
      .order('name', { ascending: true })
      .limit(limit);

    if (!includePending) {
      // Only show approved/null approval_status items in the catalog
      materialsQuery = materialsQuery.or('approval_status.is.null,approval_status.eq.approved');
    }

    if (query) {
      materialsQuery = materialsQuery.ilike('name', `%${query}%`);
    }

    const { data, error } = await materialsQuery;

    if (error) {
      console.error('Failed to fetch materials:', error);
      return NextResponse.json(
        { error: 'Failed to fetch materials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching materials list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

// POST - Create a new material request (contractor)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      unit,
      project_context,
      urgency,
      justification
    } = body || {};

    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, unit' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('materials')
      .insert({
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        category: String(category).trim(),
        unit: String(unit).trim(),
        project_context: project_context ? String(project_context).trim() : null,
        urgency: urgency ? String(urgency).trim() : 'normal',
        justification: justification ? String(justification).trim() : null,
        approval_status: 'pending',
        requested_by: contractor.id
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to submit material request:', error);
      return NextResponse.json(
        { error: 'Failed to submit material request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error submitting material request:', error);
    return NextResponse.json(
      { error: 'Failed to submit material request' },
      { status: 500 }
    );
  }
}
