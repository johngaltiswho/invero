import type { ContractorProject } from '@/data/mockData';

// Google Sheets column mapping for Projects sheet
const PROJECT_COLUMNS = {
  PROJECT_ID: 0,
  CONTRACTOR_ID: 1,
  PROJECT_NAME: 2,
  CLIENT_NAME: 3,
  PROJECT_VALUE: 4,
  START_DATE: 5,
  EXPECTED_END_DATE: 6,
  CURRENT_PROGRESS: 7,
  STATUS: 8,
  PRIORITY: 9,
  NEXT_MILESTONE: 10,
  NEXT_MILESTONE_DATE: 11,
  TEAM_SIZE: 12,
  MONTHLY_BURN_RATE: 13,
} as const;

export function transformSheetToProjects(sheetData: any[][]): ContractorProject[] {
  if (!sheetData || sheetData.length < 2) {
    console.warn('No project data found in sheet');
    return [];
  }

  // Skip header row (index 0)
  const dataRows = sheetData.slice(1);
  
  return dataRows
    .filter(row => row && row.length > 0 && row[PROJECT_COLUMNS.PROJECT_ID]) // Filter out empty rows
    .map((row, index) => {
      try {
        return transformRowToProject(row);
      } catch (error) {
        console.error(`Error transforming project row ${index + 2}:`, error);
        return null;
      }
    })
    .filter((project): project is ContractorProject => project !== null);
}

function transformRowToProject(row: any[]): ContractorProject {
  // Helper function to safely get cell value
  const getCell = (index: number, defaultValue: any = '') => {
    return row[index] !== undefined && row[index] !== null ? row[index] : defaultValue;
  };

  // Helper function to parse numbers
  const parseNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    // Handle percentage format (e.g., "50%" -> 50)
    if (typeof value === 'string' && value.includes('%')) {
      const numStr = value.replace('%', '').trim();
      const num = Number(numStr);
      return isNaN(num) ? defaultValue : num;
    }
    
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Parse progress value
  const progressValue = getCell(PROJECT_COLUMNS.CURRENT_PROGRESS);
  const parsedProgress = parseNumber(progressValue, 0);

  // Validate status
  const validateStatus = (value: string): 'Planning' | 'Active' | 'On Hold' | 'Delayed' | 'Completing' => {
    const status = String(value).trim();
    if (['Planning', 'Active', 'On Hold', 'Delayed', 'Completing'].includes(status)) {
      return status as 'Planning' | 'Active' | 'On Hold' | 'Delayed' | 'Completing';
    }
    return 'Active'; // Default fallback
  };

  // Validate priority
  const validatePriority = (value: string): 'High' | 'Medium' | 'Low' => {
    const priority = String(value).trim();
    if (['High', 'Medium', 'Low'].includes(priority)) {
      return priority as 'High' | 'Medium' | 'Low';
    }
    return 'Medium'; // Default fallback
  };

  return {
    id: getCell(PROJECT_COLUMNS.PROJECT_ID),
    contractorId: getCell(PROJECT_COLUMNS.CONTRACTOR_ID),
    projectName: getCell(PROJECT_COLUMNS.PROJECT_NAME),
    clientName: getCell(PROJECT_COLUMNS.CLIENT_NAME),
    projectValue: parseNumber(getCell(PROJECT_COLUMNS.PROJECT_VALUE)),
    startDate: getCell(PROJECT_COLUMNS.START_DATE, '2024-01-01'),
    expectedEndDate: getCell(PROJECT_COLUMNS.EXPECTED_END_DATE, '2024-12-31'),
    currentProgress: parsedProgress,
    status: validateStatus(getCell(PROJECT_COLUMNS.STATUS)),
    priority: validatePriority(getCell(PROJECT_COLUMNS.PRIORITY)),
    nextMilestone: getCell(PROJECT_COLUMNS.NEXT_MILESTONE, 'TBD'),
    nextMilestoneDate: getCell(PROJECT_COLUMNS.NEXT_MILESTONE_DATE, '2024-12-31'),
    teamSize: parseNumber(getCell(PROJECT_COLUMNS.TEAM_SIZE), 1),
    monthlyBurnRate: parseNumber(getCell(PROJECT_COLUMNS.MONTHLY_BURN_RATE), 0),
  };
}

// Validation function to check if project data is complete
export function validateProject(project: ContractorProject): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields validation
  if (!project.id) errors.push('Project ID is required');
  if (!project.contractorId) errors.push('Contractor ID is required');
  if (!project.projectName) errors.push('Project name is required');
  if (!project.clientName) errors.push('Client name is required');

  // Business validation
  if (project.projectValue <= 0) errors.push('Project value must be positive');
  if (project.currentProgress < 0 || project.currentProgress > 100) {
    errors.push('Current progress must be between 0 and 100');
  }
  if (project.teamSize <= 0) errors.push('Team size must be positive');
  if (project.monthlyBurnRate < 0) errors.push('Monthly burn rate cannot be negative');

  // Date validation
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.expectedEndDate);
  if (startDate >= endDate) {
    errors.push('Expected end date must be after start date');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export { PROJECT_COLUMNS };