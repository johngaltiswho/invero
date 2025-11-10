import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    console.log('🔍 Debug: User ID:', user?.id);
    
    if (!user) {
      return NextResponse.json({ 
        debug: 'User not authenticated',
        user: null 
      }, { status: 401 });
    }

    // Get contractor ID
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id, company_name')
      .eq('clerk_user_id', user.id)
      .single();

    console.log('🔍 Debug: Contractor query result:', { contractor, contractorError });

    if (!contractor) {
      return NextResponse.json({ 
        debug: 'Contractor not found',
        user_id: user.id,
        contractor_error: contractorError
      }, { status: 404 });
    }

    // Get ALL clients (not filtered by status first)
    const { data: allClients, error: allClientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('contractor_id', contractor.id);

    // Get active clients specifically
    const { data: activeClients, error: activeClientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('contractor_id', contractor.id)
      .eq('status', 'active');

    // Get some projects to verify data exists
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, project_name, client_name')
      .eq('contractor_id', contractor.id)
      .limit(5);

    console.log('🔍 Debug: All clients:', allClients);
    console.log('🔍 Debug: Active clients:', activeClients);
    console.log('🔍 Debug: Sample projects:', projects);

    return NextResponse.json({
      debug: 'Debug information',
      user_id: user.id,
      contractor: contractor,
      all_clients: {
        count: allClients?.length || 0,
        data: allClients,
        error: allClientsError
      },
      active_clients: {
        count: activeClients?.length || 0,
        data: activeClients,
        error: activeClientsError
      },
      sample_projects: {
        count: projects?.length || 0,
        data: projects,
        error: projectsError
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      debug: 'Debug endpoint error',
      error: error.message
    }, { status: 500 });
  }
}