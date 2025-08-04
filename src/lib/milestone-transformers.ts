// Transform Google Sheets data for Milestones and Activities

// Project Milestones Interface
export interface ProjectMilestone {
  id: string;
  projectId: string;
  milestone: string;
  dueDate: string;
  progress: number;
  status: 'pending' | 'on_track' | 'planning' | 'delayed' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

// Financial Milestones Interface  
export interface FinancialMilestone {
  id: string;
  project_ID: string;
  date: string;
  category: string;
  description: string;
  documentId?: string;
  RelatedId?: string;
  transactionType: string;
  amount: number;
  Remarks?: string;
}

export interface Activity {
  id: string;
  contractorId: string;
  type: 'milestone_completed' | 'payment_received' | 'document_uploaded' | 'funding_request' | 'progress_update';
  title: string;
  description: string;
  date: string;
  project: string;
  amount?: number;
  status: 'completed' | 'pending_review' | 'approved' | 'payment_released';
}

// Column mappings for ProjectMilestones sheet
const PROJECT_MILESTONE_COLUMNS = {
  ID: 0,           // Column A: ID
  PROJECT_ID: 1,   // Column B: projectId  
  MILESTONE: 2,    // Column C: milestone
  DUE_DATE: 3,     // Column D: dueDate
  PROGRESS: 4,     // Column E: progress
  STATUS: 5,       // Column F: status
  PRIORITY: 6,     // Column G: priority
};

// Column mappings for FinancialMilestones sheet
const FINANCIAL_MILESTONE_COLUMNS = {
  ID: 0,                // Column A: ID
  PROJECT_ID: 1,        // Column B: project_ID
  DATE: 2,              // Column C: date
  CATEGORY: 3,          // Column D: category
  DESCRIPTION: 4,       // Column E: description
  DOCUMENT_ID: 5,       // Column F: documentId
  RELATED_ID: 6,        // Column G: RelatedId
  TRANSACTION_TYPE: 7,  // Column H: transactionType
  AMOUNT: 8,            // Column I: amount
  REMARKS: 9,           // Column J: Remarks
};

// Column mappings for Activities sheet
const ACTIVITY_COLUMNS = {
  ID: 0,
  CONTRACTOR_ID: 1,
  TYPE: 2,
  TITLE: 3,
  DESCRIPTION: 4,
  DATE: 5,
  PROJECT: 6,
  AMOUNT: 7,
  STATUS: 8,
};

export function transformSheetToProjectMilestones(sheetData: any[][]): ProjectMilestone[] {
  if (!sheetData || sheetData.length <= 1) return [];

  const [headers, ...rows] = sheetData;
  
  return rows.map((row, index) => {
    const getCell = (colIndex: number): string => {
      return row[colIndex]?.toString().trim() || '';
    };

    const parseNumber = (value: string, defaultValue = 0): number => {
      if (typeof value === 'string' && value.includes('%')) {
        const numStr = value.replace('%', '').trim();
        const num = Number(numStr);
        return isNaN(num) ? defaultValue : num;
      }
      
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const validateStatus = (value: string): ProjectMilestone['status'] => {
      const status = value.toLowerCase().trim();
      const validStatuses: ProjectMilestone['status'][] = ['pending', 'on_track', 'planning', 'delayed', 'completed'];
      return validStatuses.includes(status as ProjectMilestone['status']) ? status as ProjectMilestone['status'] : 'pending';
    };

    const validatePriority = (value: string): ProjectMilestone['priority'] => {
      const priority = value.toLowerCase().trim();
      const validPriorities: ProjectMilestone['priority'][] = ['high', 'medium', 'low'];
      return validPriorities.includes(priority as ProjectMilestone['priority']) ? priority as ProjectMilestone['priority'] : 'medium';
    };

    return {
      id: getCell(PROJECT_MILESTONE_COLUMNS.ID) || `PM_${index + 1}`,
      projectId: getCell(PROJECT_MILESTONE_COLUMNS.PROJECT_ID),
      milestone: getCell(PROJECT_MILESTONE_COLUMNS.MILESTONE),
      dueDate: getCell(PROJECT_MILESTONE_COLUMNS.DUE_DATE),
      progress: parseNumber(getCell(PROJECT_MILESTONE_COLUMNS.PROGRESS)),
      status: validateStatus(getCell(PROJECT_MILESTONE_COLUMNS.STATUS)),
      priority: validatePriority(getCell(PROJECT_MILESTONE_COLUMNS.PRIORITY)),
    };
  });
}

export function transformSheetToFinancialMilestones(sheetData: any[][]): FinancialMilestone[] {
  if (!sheetData || sheetData.length <= 1) return [];

  const [headers, ...rows] = sheetData;
  
  return rows.map((row, index) => {
    const getCell = (colIndex: number): string => {
      return row[colIndex]?.toString().trim() || '';
    };

    const parseNumber = (value: string, defaultValue = 0): number => {
      if (!value) return defaultValue;
      // Remove commas and parse as number
      const cleanValue = value.toString().replace(/,/g, '').trim();
      const num = Number(cleanValue);
      if (isNaN(num)) {
        console.warn(`Failed to parse number: "${value}" -> "${cleanValue}"`);
        return defaultValue;
      }
      return num;
    };

    return {
      id: getCell(FINANCIAL_MILESTONE_COLUMNS.ID) || `FM_${index + 1}`,
      project_ID: getCell(FINANCIAL_MILESTONE_COLUMNS.PROJECT_ID),
      date: getCell(FINANCIAL_MILESTONE_COLUMNS.DATE),
      category: getCell(FINANCIAL_MILESTONE_COLUMNS.CATEGORY),
      description: getCell(FINANCIAL_MILESTONE_COLUMNS.DESCRIPTION),
      documentId: getCell(FINANCIAL_MILESTONE_COLUMNS.DOCUMENT_ID) || undefined,
      RelatedId: getCell(FINANCIAL_MILESTONE_COLUMNS.RELATED_ID) || undefined,
      transactionType: getCell(FINANCIAL_MILESTONE_COLUMNS.TRANSACTION_TYPE),
      amount: parseNumber(getCell(FINANCIAL_MILESTONE_COLUMNS.AMOUNT)),
      Remarks: getCell(FINANCIAL_MILESTONE_COLUMNS.REMARKS) || undefined,
    };
  });
}

export function transformSheetToActivities(sheetData: any[][]): Activity[] {
  if (!sheetData || sheetData.length <= 1) return [];

  const [headers, ...rows] = sheetData;
  
  return rows.map((row, index) => {
    const getCell = (colIndex: number): string => {
      return row[colIndex]?.toString().trim() || '';
    };

    const parseNumber = (value: string): number | undefined => {
      if (!value) return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    };

    const validateType = (value: string): Activity['type'] => {
      const type = value.toLowerCase().replace(/\s+/g, '_').trim();
      const validTypes: Activity['type'][] = ['milestone_completed', 'payment_received', 'document_uploaded', 'funding_request', 'progress_update'];
      return validTypes.includes(type as Activity['type']) ? type as Activity['type'] : 'progress_update';
    };

    const validateStatus = (value: string): Activity['status'] => {
      const status = value.toLowerCase().replace(/\s+/g, '_').trim();
      const validStatuses: Activity['status'][] = ['completed', 'pending_review', 'approved', 'payment_released'];
      return validStatuses.includes(status as Activity['status']) ? status as Activity['status'] : 'completed';
    };

    return {
      id: getCell(ACTIVITY_COLUMNS.ID) || `ACT_${index + 1}`,
      contractorId: getCell(ACTIVITY_COLUMNS.CONTRACTOR_ID),
      type: validateType(getCell(ACTIVITY_COLUMNS.TYPE)),
      title: getCell(ACTIVITY_COLUMNS.TITLE),
      description: getCell(ACTIVITY_COLUMNS.DESCRIPTION),
      date: getCell(ACTIVITY_COLUMNS.DATE),
      project: getCell(ACTIVITY_COLUMNS.PROJECT),
      amount: parseNumber(getCell(ACTIVITY_COLUMNS.AMOUNT)),
      status: validateStatus(getCell(ACTIVITY_COLUMNS.STATUS)),
    };
  });
}