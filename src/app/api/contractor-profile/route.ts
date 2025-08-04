import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getGoogleSheetsAPI } from '@/lib/google-sheets';
import { transformSheetToContractors, validateContractor } from '@/lib/data-transformers';
import { transformSheetToProjects, validateProject } from '@/lib/project-transformers';
import { transformSheetToProjectMilestones, transformSheetToFinancialMilestones, transformSheetToActivities, type ProjectMilestone, type FinancialMilestone, type Activity } from '@/lib/milestone-transformers';
import type { Contractor, ContractorProject } from '@/data/mockData';

// Cache for contractor profile data
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
let contractorCache: {
  [email: string]: {
    data: any;
    timestamp: number;
  }
} = {};

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Contractor Profile API called');
    
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
    
    // Fetch contractors, projects, milestones, and activities from Google Sheets
    console.log('📊 Fetching data from Google Sheets...');
    const sheetsAPI = getGoogleSheetsAPI();
    
    // Fetch all data in parallel (skip Activities since you don't have that sheet)
    const [contractorData, projectData, projectMilestonesData, financialMilestonesData] = await Promise.all([
      sheetsAPI.getContractorData(),
      sheetsAPI.getProjectData().catch(error => {
        console.warn('Projects sheet not found or empty:', error.message);
        return [];
      }),
      sheetsAPI.getProjectMilestonesData().catch(error => {
        console.warn('ProjectMilestones sheet not found or empty:', error.message);
        return [];
      }),
      sheetsAPI.getFinancialMilestonesData().catch(error => {
        console.warn('FinancialMilestones sheet not found or empty:', error.message);
        return [];
      })
    ]);
    
    // Set empty activities data since no Activities sheet exists
    const activitiesData: any[][] = [];
    
    if (!contractorData || contractorData.length === 0) {
      console.log('❌ No contractors loaded from Google Sheets');
      return NextResponse.json(
        { 
          error: 'No contractor data available',
          message: 'Unable to load contractor data from Google Sheets'
        },
        { status: 503 }
      );
    }

    const contractors = transformSheetToContractors(contractorData);
    const projects = transformSheetToProjects(projectData);
    const projectMilestones = transformSheetToProjectMilestones(projectMilestonesData);
    const financialMilestones = transformSheetToFinancialMilestones(financialMilestonesData);
    const activities: Activity[] = []; // No Activities sheet, so empty array
    const errors: string[] = [];

    console.log(`📋 Google Sheets result:`, {
      totalContractors: contractors.length,
      totalProjects: projects.length,
      totalProjectMilestones: projectMilestones.length,
      totalFinancialMilestones: financialMilestones.length,
      totalActivities: activities.length,
      errors: errors.length,
    });
    
    // Find contractor by email
    console.log(`🔍 Searching for contractor with email: ${userEmail}`);
    const contractor = contractors.find(
      c => c.email && c.email.toLowerCase() === userEmail?.toLowerCase()
    );
    
    if (!contractor) {
      console.log('❌ Contractor not found');
      return NextResponse.json(
        { 
          error: 'Contractor not found',
          message: `No contractor found with email: ${userEmail}`,
        },
        { status: 404 }
      );
    }
    
    // Link projects, milestones, and activities to the contractor  
    const contractorProjects = projects.filter(project => project.contractorId === contractor.id);
    const contractorProjectIds = contractorProjects.map(p => p.id);
    const contractorProjectMilestones = projectMilestones.filter(milestone => contractorProjectIds.includes(milestone.projectId));
    const contractorFinancialMilestones = financialMilestones.filter(milestone => contractorProjectIds.includes(milestone.project_ID));
    const contractorActivities = activities.filter(activity => activity.contractorId === contractor.id);
    
    const contractorWithData = {
      ...contractor,
      currentProjects: contractorProjects,
      projectMilestones: contractorProjectMilestones,
      financialMilestones: contractorFinancialMilestones,
      activities: contractorActivities,
    };
    
    console.log('✅ Found contractor:', contractor.companyName, 'with', contractorProjects.length, 'projects,', contractorProjectMilestones.length, 'project milestones,', contractorFinancialMilestones.length, 'financial milestones,', contractorActivities.length, 'activities');

    return NextResponse.json({
      success: true,
      contractor: contractorWithData,
      message: 'Contractor profile loaded successfully',
    });

  } catch (error) {
    console.error('💥 Error in contractor profile API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}