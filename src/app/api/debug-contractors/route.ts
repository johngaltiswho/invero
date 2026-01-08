import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get ALL contractors to see what exists
    const { data: allContractors, error: allError } = await supabase
      .from('contractors')
      .select('*');

    // Try to find contractor by clerk_user_id
    const { data: matchingContractor, error: matchError } = await supabase
      .from('contractors')
      .select('*')
      .eq('clerk_user_id', user.id)
      .maybeSingle();

    // Get projects to see which contractor_ids have data
    const { data: projectContractors, error: projectError } = await supabase
      .from('projects')
      .select('contractor_id')
      .not('contractor_id', 'is', null);

    const uniqueProjectContractorIds = [...new Set(projectContractors?.map((p: any) => p.contractor_id) || [])];

    return NextResponse.json({
      current_user_id: user.id,
      all_contractors: allContractors,
      matching_contractor: matchingContractor,
      unique_project_contractor_ids: uniqueProjectContractorIds,
      errors: {
        all: allError,
        match: matchError,
        projects: projectError
      }
    });

  } catch (error) {
    console.error('Debug contractors error:', error);
    return NextResponse.json({
      error: (error as any)?.message || 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create contractor if needed
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { contractor_id_to_link } = body;

    if (contractor_id_to_link) {
      // Link existing contractor to current user
      const { data: updatedContractor, error: updateError } = await (supabase as any)
        .from('contractors')
        .update({ clerk_user_id: user.id })
        .eq('id', contractor_id_to_link)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to link contractor', details: updateError }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'linked_existing_contractor',
        contractor: updatedContractor
      });
    } else {
      // Create new contractor
      const { data: newContractor, error: createError } = await (supabase as any)
        .from('contractors')
        .insert({
          clerk_user_id: user.id,
          company_name: user.firstName ? `${user.firstName}'s Company` : 'My Company',
          contact_person: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Owner',
          email: user.emailAddresses?.[0]?.emailAddress || '',
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: 'Failed to create contractor', details: createError }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'created_new_contractor',
        contractor: newContractor
      });
    }

  } catch (error) {
    console.error('Create contractor error:', error);
    return NextResponse.json({
      error: (error as any)?.message || 'Unknown error'
    }, { status: 500 });
  }
}