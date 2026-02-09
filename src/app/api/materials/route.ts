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

    let materialsQuery = supabase
      .from('materials')
      .select('id, name, category, unit, description')
      .order('name', { ascending: true })
      .limit(limit);

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
