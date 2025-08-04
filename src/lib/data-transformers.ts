import type { Contractor, ContractorProject } from '@/data/mockData';

// Google Sheets column mapping - matches YOUR actual sheet structure
const CONTRACTOR_COLUMNS = {
  ID: 0,                        // ID
  COMPANY_NAME: 1,             // Company Name  
  PAN_NUMBER: 2,               // Pan Number
  REGISTRATION_NUMBER: 3,       // Registration Number
  GSTIN: 4,                    // GSTIN
  CONTACT_PERSON: 5,           // Contact Person
  EMAIL: 6,                    // Email
  PHONE: 7,                    // Phone
  YEARS_IN_BUSINESS: 8,        // Years in Business
  EMPLOYEE_COUNT: 9,           // Employee Count
  ANNUAL_TURNOVER: 10,         // Annual Turnover
  BUSINESS_CATEGORY: 11,       // Business Category
  SPECIALIZATIONS: 12,         // Specializations
  COMPLETED_PROJECTS: 13,      // Completed Projects
  SUCCESS_RATE: 14,            // Success Rate
  AVERAGE_PROJECT_VALUE: 15,   // Average Project Value
  CREDIT_SCORE: 16,            // Credit Score
  RISK_RATING: 17,             // Risk Rating
  BANK_NAME: 18,               // Bank Name
  ACCOUNT_NUMBER: 19,          // Account Number
  IFSC_CODE: 20,               // IFSC Code
  PAN_CARD: 21,                // PAN Card
  GST_CERTIFICATE: 22,         // GST Certificate
  INCORPORATION_CERTIFICATE: 23, // Incorporation Certificate
  BANK_STATEMENTS: 24,         // Bank Statements
  FINANCIAL_STATEMENTS: 25,    // Financial Statements
  CAPACITY_UTILIZATION: 26,    // Capacity Utilization
  AVAILABLE_CAPACITY: 27,      // Available Capacity
  NEXT_AVAILABLE_DATE: 28,     // Net Available Date
} as const;

export function transformSheetToContractors(sheetData: any[][]): Contractor[] {
  if (!sheetData || sheetData.length < 2) {
    console.warn('No contractor data found in sheet');
    return [];
  }

  // Skip header row (index 0)
  const dataRows = sheetData.slice(1);
  
  return dataRows
    .filter(row => row && row.length > 0 && row[CONTRACTOR_COLUMNS.ID]) // Filter out empty rows
    .map((row, index) => {
      try {
        return transformRowToContractor(row);
      } catch (error) {
        console.error(`Error transforming contractor row ${index + 2}:`, error);
        return null;
      }
    })
    .filter((contractor): contractor is Contractor => contractor !== null);
}

function transformRowToContractor(row: any[]): Contractor {
  // Helper function to safely get cell value
  const getCell = (index: number, defaultValue: any = '') => {
    return row[index] !== undefined && row[index] !== null ? row[index] : defaultValue;
  };

  // Helper function to parse specializations
  const parseSpecializations = (value: string): string[] => {
    if (!value) return [];
    try {
      // Try parsing as JSON first
      return JSON.parse(value);
    } catch {
      // Fallback to comma-separated values
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
  };

  // Helper function to parse current projects
  const parseCurrentProjects = (value: string): ContractorProject[] => {
    if (!value) return [];
    try {
      const projects = JSON.parse(value);
      return Array.isArray(projects) ? projects : [];
    } catch {
      console.warn('Failed to parse current projects JSON:', value);
      return [];
    }
  };

  // Helper function to parse boolean values
  const parseBoolean = (value: string): boolean => {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase().trim();
    return str === 'true' || str === 'yes' || str === '1' || str === 'completed';
  };

  // Helper function to parse numbers
  const parseNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    // Handle percentage format (e.g., "75%" -> 75)
    if (typeof value === 'string' && value.includes('%')) {
      const numStr = value.replace('%', '').trim();
      const num = Number(numStr);
      return isNaN(num) ? defaultValue : num;
    }
    
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Validate risk rating
  const validateRiskRating = (value: string): 'Low' | 'Medium' | 'High' => {
    const rating = String(value).trim();
    if (['Low', 'Medium', 'High'].includes(rating)) {
      return rating as 'Low' | 'Medium' | 'High';
    }
    return 'Medium'; // Default fallback
  };

  return {
    id: getCell(CONTRACTOR_COLUMNS.ID),
    companyName: getCell(CONTRACTOR_COLUMNS.COMPANY_NAME),
    registrationNumber: getCell(CONTRACTOR_COLUMNS.REGISTRATION_NUMBER),
    panNumber: getCell(CONTRACTOR_COLUMNS.PAN_NUMBER),
    gstin: getCell(CONTRACTOR_COLUMNS.GSTIN),
    contactPerson: getCell(CONTRACTOR_COLUMNS.CONTACT_PERSON),
    email: getCell(CONTRACTOR_COLUMNS.EMAIL),
    phone: getCell(CONTRACTOR_COLUMNS.PHONE),
    yearsInBusiness: parseNumber(getCell(CONTRACTOR_COLUMNS.YEARS_IN_BUSINESS)),
    employeeCount: parseNumber(getCell(CONTRACTOR_COLUMNS.EMPLOYEE_COUNT)),
    annualTurnover: parseNumber(getCell(CONTRACTOR_COLUMNS.ANNUAL_TURNOVER)),
    businessCategory: getCell(CONTRACTOR_COLUMNS.BUSINESS_CATEGORY),
    specializations: parseSpecializations(getCell(CONTRACTOR_COLUMNS.SPECIALIZATIONS)),
    completedProjects: parseNumber(getCell(CONTRACTOR_COLUMNS.COMPLETED_PROJECTS)),
    successRate: parseNumber(getCell(CONTRACTOR_COLUMNS.SUCCESS_RATE), 95),
    averageProjectValue: parseNumber(getCell(CONTRACTOR_COLUMNS.AVERAGE_PROJECT_VALUE)),
    creditScore: parseNumber(getCell(CONTRACTOR_COLUMNS.CREDIT_SCORE), 750),
    riskRating: validateRiskRating(getCell(CONTRACTOR_COLUMNS.RISK_RATING)),
    bankDetails: {
      bankName: getCell(CONTRACTOR_COLUMNS.BANK_NAME),
      accountNumber: getCell(CONTRACTOR_COLUMNS.ACCOUNT_NUMBER),
      ifscCode: getCell(CONTRACTOR_COLUMNS.IFSC_CODE),
    },
    documents: {
      panCard: parseBoolean(getCell(CONTRACTOR_COLUMNS.PAN_CARD)),
      gstCertificate: parseBoolean(getCell(CONTRACTOR_COLUMNS.GST_CERTIFICATE)),
      incorporationCertificate: parseBoolean(getCell(CONTRACTOR_COLUMNS.INCORPORATION_CERTIFICATE)),
      bankStatements: parseBoolean(getCell(CONTRACTOR_COLUMNS.BANK_STATEMENTS)),
      financialStatements: parseBoolean(getCell(CONTRACTOR_COLUMNS.FINANCIAL_STATEMENTS)),
    },
    // New capacity-related fields (projects will be linked separately)
    currentProjects: [], // Will be populated by linking function
    capacityUtilization: parseNumber(getCell(CONTRACTOR_COLUMNS.CAPACITY_UTILIZATION), 0),
    availableCapacity: parseNumber(getCell(CONTRACTOR_COLUMNS.AVAILABLE_CAPACITY), 0),
    nextAvailableDate: getCell(CONTRACTOR_COLUMNS.NEXT_AVAILABLE_DATE, '2024-12-31'),
  };
}

// Validation function to check if contractor data is complete
export function validateContractor(contractor: Contractor): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields validation
  if (!contractor.id) errors.push('ID is required');
  if (!contractor.companyName) errors.push('Company name is required');
  if (!contractor.email) errors.push('Email is required');
  if (!contractor.phone) errors.push('Phone is required');
  if (!contractor.contactPerson) errors.push('Contact person is required');

  // Business validation
  if (contractor.yearsInBusiness < 0) errors.push('Years in business cannot be negative');
  if (contractor.employeeCount < 0) errors.push('Employee count cannot be negative');
  if (contractor.annualTurnover < 0) errors.push('Annual turnover cannot be negative');
  if (contractor.successRate < 0 || contractor.successRate > 100) {
    errors.push('Success rate must be between 0 and 100');
  }
  // Allow flexible credit score values for Google Sheets data
  // if (contractor.creditScore < 300 || contractor.creditScore > 850) {
  //   errors.push('Credit score must be between 300 and 850');
  // }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (contractor.email && !emailRegex.test(contractor.email)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export { CONTRACTOR_COLUMNS };