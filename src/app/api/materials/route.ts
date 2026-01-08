import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('materials')
      .select('*')
      .eq('is_active', true)
      .or('approval_status.eq.approved,approval_status.is.null')
      .order('category')
      .order('name')
      .limit(limit);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error('Failed to fetch materials:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch materials',
        details: (error as any)?.message || 'Unknown error' 
      }, { status: 500 });
    }

    // Group materials by category for better UX
    const materialsByCategory = materials?.reduce((acc: any, material) => {
      const category = material.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(material);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: materials,
      grouped: materialsByCategory,
      count: materials?.length || 0
    });

  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch materials',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new material request
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
      urgency = 'normal'
    } = body;

    // Validate required fields
    if (!name || !category || !unit) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, category, unit' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get contractor ID
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, company_name, contact_person')
      .eq('clerk_user_id', user.id)
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Check for potential duplicates
    const { data: duplicates } = await supabase
      .from('materials')
      .select('id, name, approval_status')
      .eq('name', name)
      .eq('category', category)
      .in('approval_status', ['pending', 'approved']);

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json({ 
        error: 'A similar material already exists',
        details: `Material "${name}" in category "${category}" already exists with status: ${duplicates[0]?.approval_status || 'unknown'}`,
        duplicate_id: duplicates[0]?.id
      }, { status: 409 });
    }

    // Create the material request
    const materialData = {
      name,
      description,
      category,
      unit,
      project_context,
      urgency,
      approval_status: 'pending',
      requested_by: contractor.id
    };

    const { data: newMaterial, error: insertError } = await supabase
      .from('materials')
      .insert(materialData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create material request:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create material request',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log(`✅ New material request created: ${name} by ${contractor.company_name}`);

    return NextResponse.json({
      success: true,
      data: newMaterial,
      message: 'Material request submitted successfully. It will be reviewed by our admin team.'
    });

  } catch (error) {
    console.error('Error creating material request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create material request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}