import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheetsAPI } from '@/lib/google-sheets';
import { transformSheetToContractors, validateContractor } from '@/lib/data-transformers';
import { transformSheetToProjects, validateProject } from '@/lib/project-transformers';
import type { Contractor, ContractorProject } from '@/data/mockData';

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let cache: {
  contractors: Contractor[];
  projects: ContractorProject[];
  timestamp: number;
  errors: string[];
} | null = null;

function isCacheValid(): boolean {
  return cache !== null && (Date.now() - cache.timestamp) < CACHE_DURATION;
}

function linkProjectsToContractors(contractors: Contractor[], projects: ContractorProject[]): Contractor[] {
  return contractors.map(contractor => {
    // Find all projects for this contractor
    const contractorProjects = projects.filter(project => project.contractorId === contractor.id);
    
    return {
      ...contractor,
      currentProjects: contractorProjects,
    };
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && isCacheValid() && cache) {
    // Link projects to contractors
    const contractorsWithProjects = linkProjectsToContractors(cache.contractors, cache.projects);
    return NextResponse.json({
      contractors: contractorsWithProjects,
      projects: cache.projects,
      errors: cache.errors,
      fromCache: true,
    });
  }

  try {
    console.log('Fetching fresh data from Google Sheets...');
    
    const sheetsAPI = getGoogleSheetsAPI();
    
    // Fetch both contractors and projects in parallel
    const [contractorData, projectData] = await Promise.all([
      sheetsAPI.getContractorData(),
      sheetsAPI.getProjectData().catch(error => {
        console.warn('Projects sheet not found or empty:', error.message);
        return []; // Return empty array if projects sheet doesn't exist
      })
    ]);
    
    if (!contractorData || contractorData.length === 0) {
      throw new Error('No contractor data found in Google Sheets');
    }

    const contractors = transformSheetToContractors(contractorData);
    const projects = transformSheetToProjects(projectData);
    const errors: string[] = [];

    // Validate contractors
    contractors.forEach((contractor, index) => {
      const validation = validateContractor(contractor);
      if (!validation.isValid) {
        errors.push(`Contractor Row ${index + 2}: ${validation.errors.join(', ')}`);
      }
    });

    // Validate projects
    projects.forEach((project, index) => {
      const validation = validateProject(project);
      if (!validation.isValid) {
        errors.push(`Project Row ${index + 2}: ${validation.errors.join(', ')}`);
      }
    });

    // Link projects to contractors
    const contractorsWithProjects = linkProjectsToContractors(contractors, projects);

    // Update cache
    cache = {
      contractors,
      projects,
      timestamp: Date.now(),
      errors,
    };

    console.log(`Successfully fetched ${contractors.length} contractors and ${projects.length} projects with ${errors.length} validation errors`);

    return NextResponse.json({
      contractors: contractorsWithProjects,
      projects,
      errors,
      fromCache: false,
    });

  } catch (error) {
    console.error('Error fetching contractor data:', error);
    
    // Return cached data as fallback if available
    if (cache) {
      console.log('Returning stale cached data due to fetch error');
      const contractorsWithProjects = linkProjectsToContractors(cache.contractors, cache.projects);
      return NextResponse.json({
        contractors: contractorsWithProjects,
        projects: cache.projects,
        errors: [`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`, ...cache.errors],
        fromCache: true,
      });
    }

    // No cache available, return error
    return NextResponse.json(
      {
        contractors: [],
        projects: [],
        errors: [`Failed to fetch contractor data: ${error instanceof Error ? error.message : 'Unknown error'}`],
        fromCache: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Clear cache endpoint
  cache = null;
  return NextResponse.json({ message: 'Cache cleared successfully' });
}