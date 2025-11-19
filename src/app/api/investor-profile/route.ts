import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('🔍 Investor Profile API called');
    
    // Get user info from Clerk
    const user = await currentUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const userEmail = user.emailAddresses[0]?.emailAddress;
    console.log('✅ User authenticated, email:', userEmail);
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'No email found for user' },
        { status: 400 }
      );
    }

    // Check if user is registered as an investor
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .eq('status', 'active')
      .single();

    if (investorError || !investor) {
      console.log('❌ No active investor found for email:', userEmail);
      return NextResponse.json({
        success: false,
        error: 'Investor profile not found',
        message: 'Your email is not registered as an active investor in our system. Please contact support to get access.'
      }, { status: 404 });
    }

    console.log('✅ Active investor found:', investor.name);

    // Fetch all projects for investment opportunities
    console.log('🔄 Fetching all projects for opportunities...');
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
    }

    // Fetch all contractors 
    console.log('🔄 Fetching all contractors...');
    const { data: allContractors, error: contractorsError } = await supabase
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false });

    if (contractorsError) {
      console.error('❌ Error fetching contractors:', contractorsError);
    }

    // Fetch capital deployments for this investor
    console.log('🔄 Fetching investor capital deployments...');
    const { data: capitalTransactions, error: capitalError } = await supabase
      .from('capital_transactions')
      .select(`
        id,
        investor_id,
        project_id,
        contractor_id,
        amount,
        transaction_type,
        status,
        description,
        reference_number,
        created_at,
        updated_at,
        projects:project_id (
          id,
          project_name,
          client_name,
          project_status,
          contractor_id,
          expected_irr,
          project_tenure
        ),
        contractors:contractor_id (
          id,
          company_name
        )
      `)
      .eq('investor_id', investor.id)
      .eq('transaction_type', 'deployment')
      .order('created_at', { ascending: false });

    if (capitalError) {
      console.error('❌ Error fetching capital transactions:', capitalError);
    }

    const investments = (capitalTransactions || []).map((tx) => ({
      id: tx.id,
      investorId: tx.investor_id,
      projectId: tx.project_id,
      contractorId: tx.contractor_id || tx.projects?.contractor_id || null,
      investmentAmount: Number(tx.amount) || 0,
      investmentDate: tx.created_at,
      expectedReturn: tx.projects?.expected_irr ?? 0,
      actualReturn: null,
      status: tx.status === 'completed' ? 'Completed' : 'Active',
      description: tx.description,
      referenceNumber: tx.reference_number,
      project: tx.projects,
      contractor: tx.contractors
    }));

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0);
    const activeInvestments = investments.filter(inv => inv.status !== 'Completed').length;
    const completedInvestments = investments.filter(inv => inv.status === 'Completed').length;

    console.log(`✅ Fetched ${allProjects?.length || 0} projects, ${allContractors?.length || 0} contractors, ${investments.length} capital deployments`);

    const investorProfile = {
      id: investor.id,
      investorName: investor.name,
      email: investor.email,
      investorType: investor.investor_type,
      phone: investor.phone,
      status: investor.status,
      investments,
      returns: [],
      allProjects: allProjects || [],
      allContractors: allContractors || [],
      relatedContractors: allContractors || [],
      relatedProjects: allProjects || [],
      portfolioMetrics: {
        totalInvested,
        totalReturns: 0,
        currentValue: totalInvested,
        roi: 0,
        activeInvestments,
        completedInvestments,
        totalInvestments: investments.length
      },
      availableOpportunities: allProjects || []
    };

    return NextResponse.json({
      success: true,
      investor: investorProfile
    });

  } catch (error) {
    console.error('💥 Error in investor profile API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
