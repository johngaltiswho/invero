import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getGoogleSheetsAPI } from '@/lib/google-sheets';
import { transformSheetToInvestorProfiles, transformSheetToInvestments, transformSheetToReturns } from '@/lib/investor-transformers';
import { transformSheetToContractors } from '@/lib/data-transformers';
import { transformSheetToProjects } from '@/lib/project-transformers';

export async function GET(request: NextRequest) {
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
    
    // Fetch all data from Google Sheets
    console.log('📊 Fetching data from Google Sheets...');
    const sheetsAPI = getGoogleSheetsAPI();
    
    // Fetch all data in parallel
    const [
      investorProfilesData, 
      investmentsData, 
      returnsData, 
      contractorData, 
      projectData
    ] = await Promise.all([
      sheetsAPI.getInvestorProfilesData().catch(error => {
        console.warn('InvestorProfiles sheet not found or empty:', error.message);
        return [];
      }),
      sheetsAPI.getInvestmentsData().catch(error => {
        console.warn('Investments sheet not found or empty:', error.message);
        return [];
      }),
      sheetsAPI.getReturnsData().catch(error => {
        console.warn('Returns sheet not found or empty:', error.message);
        return [];
      }),
      sheetsAPI.getContractorData().catch(error => {
        console.warn('Contractors sheet not found or empty:', error.message);
        return [];
      }),
      sheetsAPI.getProjectData().catch(error => {
        console.warn('Projects sheet not found or empty:', error.message);
        return [];
      })
    ]);
    
    // Transform the data
    const investorProfiles = transformSheetToInvestorProfiles(investorProfilesData);
    const investments = transformSheetToInvestments(investmentsData);
    const returns = transformSheetToReturns(returnsData);
    const contractors = transformSheetToContractors(contractorData);
    const projects = transformSheetToProjects(projectData);
    
    console.log(`📋 Google Sheets result:`, {
      totalInvestorProfiles: investorProfiles.length,
      totalInvestments: investments.length,
      totalReturns: returns.length,
      totalContractors: contractors.length,
      totalProjects: projects.length,
    });

    // Debug contractor data
    console.log('📊 First few contractors:', contractors.slice(0, 3).map(c => ({ 
      id: c.id, 
      name: c.companyName, 
      category: c.businessCategory,
      riskRating: c.riskRating
    })));
    
    // Debug project data  
    console.log('📊 First few projects:', projects.slice(0, 3).map(p => ({ 
      id: p.id, 
      name: p.projectName, 
      contractorId: p.contractorId,
      status: p.status,
      value: p.projectValue
    })));
    
    // Find investor by email
    console.log(`🔍 Searching for investor with email: ${userEmail}`);
    const investor = investorProfiles.find(
      i => i.email && i.email.toLowerCase() === userEmail?.toLowerCase()
    );
    
    if (!investor) {
      console.log('❌ Investor not found');
      return NextResponse.json(
        { 
          error: 'Investor not found',
          message: `No investor profile found with email: ${userEmail}`,
        },
        { status: 404 }
      );
    }
    
    // Get investor's investments and related data
    const investorInvestments = investments.filter(inv => 
      inv.investorEmail.toLowerCase() === userEmail?.toLowerCase()
    );
    
    const investmentIds = investorInvestments.map(inv => inv.id);
    const investorReturns = returns.filter(ret => 
      investmentIds.includes(ret.investmentId)
    );
    
    // Get contractors and projects related to investor's investments
    const investorContractorIds = [...new Set(investorInvestments.map(inv => inv.contractorId))];
    const investorProjectIds = [...new Set(investorInvestments.map(inv => inv.projectId))];
    
    console.log('💼 Investor contractor IDs:', investorContractorIds);
    console.log('💼 Investor project IDs:', investorProjectIds);
    
    const relatedContractors = contractors.filter(c => 
      investorContractorIds.includes(c.id)
    );
    
    const relatedProjects = projects.filter(p => 
      investorProjectIds.includes(p.id)
    );
    
    console.log('💼 Related contractors:', relatedContractors.length);
    console.log('💼 Related projects:', relatedProjects.length);
    
    // Calculate portfolio metrics
    const totalInvested = investorInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
    const totalReturns = investorReturns.reduce((sum, ret) => sum + ret.returnAmount, 0);
    const activeInvestments = investorInvestments.filter(inv => inv.status === 'Active');
    const completedInvestments = investorInvestments.filter(inv => inv.status === 'Completed');
    
    const portfolioMetrics = {
      totalInvested,
      totalReturns,
      currentValue: totalInvested + totalReturns,
      roi: totalInvested > 0 ? ((totalReturns / totalInvested) * 100) : 0,
      activeInvestments: activeInvestments.length,
      completedInvestments: completedInvestments.length,
      totalInvestments: investorInvestments.length
    };
    
    // Calculate available opportunities
    const availableOpportunities = contractors.filter(c => 
      !investorContractorIds.includes(c.id)
    );
    
    console.log('🚀 Available opportunities:', availableOpportunities.length);
    console.log('🚀 First few available contractors:', availableOpportunities.slice(0, 3).map(c => ({
      id: c.id,
      name: c.companyName,
      category: c.businessCategory
    })));

    // For opportunities, we need access to ALL contractors and projects, not just related ones
    const investorWithData = {
      ...investor,
      investments: investorInvestments,
      returns: investorReturns,
      relatedContractors,
      relatedProjects,
      portfolioMetrics,
      availableOpportunities,
      // Include all contractors and projects for opportunities generation
      allContractors: contractors,
      allProjects: projects
    };
    
    console.log('✅ Found investor:', investor.investorName, 'with', investorInvestments.length, 'investments,', investorReturns.length, 'returns');

    return NextResponse.json({
      success: true,
      investor: investorWithData,
      message: 'Investor profile loaded successfully',
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