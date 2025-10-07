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
        details: error.message 
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

// GET material categories for filter dropdown
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: categories, error } = await supabase
      .from('materials')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch categories',
        details: error.message 
      }, { status: 500 });
    }

    // Get unique categories
    const uniqueCategories = [...new Set(categories?.map(item => item.category))];

    return NextResponse.json({
      success: true,
      data: uniqueCategories,
      count: uniqueCategories.length
    });

  } catch (error) {
    console.error('Error fetching material categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch material categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}