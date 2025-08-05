// Investor data transformers for Google Sheets integration

export interface InvestorProfile {
  id: string;
  email: string;
  investorName: string;
  investorType: 'Individual' | 'Fund' | 'Institution';
  totalInvested: number;
  availableCapital: number;
  riskTolerance: 'Low' | 'Medium' | 'High';
  preferredSectors: string[];
  joinDate: string;
}

export interface Investment {
  id: string;
  investorEmail: string;
  contractorId: string;
  projectId: string;
  investmentAmount: number;
  investmentDate: string;
  expectedReturn: number;
  status: 'Active' | 'Completed' | 'Defaulted';
  actualReturn?: number;
}

export interface Return {
  id: string;
  investmentId: string;
  returnDate: string;
  returnAmount: number;
  returnType: 'Interest' | 'Principal' | 'Bonus';
  projectMilestone?: string;
}

// Transform Google Sheets data to InvestorProfile objects
export function transformSheetToInvestorProfiles(data: any[][]): InvestorProfile[] {
  if (!data || data.length < 2) return [];

  const headers = data[0];
  const investorProfiles: InvestorProfile[] = [];

  // Column mappings for InvestorProfiles sheet
  const columnMap = {
    id: 'ID',
    email: 'email',
    investorName: 'investorName',
    investorType: 'investorType',
    totalInvested: 'totalInvested',
    availableCapital: 'availableCapital',
    riskTolerance: 'riskTolerance',
    preferredSectors: 'preferredSectors',
    joinDate: 'joinDate'
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    try {
      const profile: InvestorProfile = {
        id: getColumnValue(row, headers, columnMap.id) || `INVESTOR_${i}`,
        email: getColumnValue(row, headers, columnMap.email) || '',
        investorName: getColumnValue(row, headers, columnMap.investorName) || '',
        investorType: getColumnValue(row, headers, columnMap.investorType) || 'Individual',
        totalInvested: parseFloat(getColumnValue(row, headers, columnMap.totalInvested)) || 0,
        availableCapital: parseFloat(getColumnValue(row, headers, columnMap.availableCapital)) || 0,
        riskTolerance: getColumnValue(row, headers, columnMap.riskTolerance) || 'Medium',
        preferredSectors: getColumnValue(row, headers, columnMap.preferredSectors)?.split(',').map(s => s.trim()) || [],
        joinDate: getColumnValue(row, headers, columnMap.joinDate) || new Date().toISOString().split('T')[0]
      };

      if (profile.email) {
        investorProfiles.push(profile);
      }
    } catch (error) {
      console.warn(`Error parsing investor profile row ${i}:`, error);
    }
  }

  return investorProfiles;
}

// Transform Google Sheets data to Investment objects
export function transformSheetToInvestments(data: any[][]): Investment[] {
  if (!data || data.length < 2) return [];

  const headers = data[0];
  const investments: Investment[] = [];

  // Column mappings for Investments sheet
  const columnMap = {
    id: 'ID',
    investorEmail: 'investorEmail',
    contractorId: 'contractorId',
    projectId: 'projectId',
    investmentAmount: 'investmentAmount',
    investmentDate: 'investmentDate',
    expectedReturn: 'expectedReturn',
    status: 'status',
    actualReturn: 'actualReturn'
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    try {
      const investment: Investment = {
        id: getColumnValue(row, headers, columnMap.id) || `INV_${i}`,
        investorEmail: getColumnValue(row, headers, columnMap.investorEmail) || '',
        contractorId: getColumnValue(row, headers, columnMap.contractorId) || '',
        projectId: getColumnValue(row, headers, columnMap.projectId) || '',
        investmentAmount: parseFloat(getColumnValue(row, headers, columnMap.investmentAmount)) || 0,
        investmentDate: getColumnValue(row, headers, columnMap.investmentDate) || new Date().toISOString().split('T')[0],
        expectedReturn: parseFloat(getColumnValue(row, headers, columnMap.expectedReturn)) || 0,
        status: getColumnValue(row, headers, columnMap.status) || 'Active',
        actualReturn: parseFloat(getColumnValue(row, headers, columnMap.actualReturn)) || undefined
      };

      if (investment.investorEmail && investment.contractorId) {
        investments.push(investment);
      }
    } catch (error) {
      console.warn(`Error parsing investment row ${i}:`, error);
    }
  }

  return investments;
}

// Transform Google Sheets data to Return objects
export function transformSheetToReturns(data: any[][]): Return[] {
  if (!data || data.length < 2) return [];

  const headers = data[0];
  const returns: Return[] = [];

  // Column mappings for Returns sheet
  const columnMap = {
    id: 'ID',
    investmentId: 'investmentId',
    returnDate: 'returnDate',
    returnAmount: 'returnAmount',
    returnType: 'returnType',
    projectMilestone: 'projectMilestone'
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    try {
      const returnRecord: Return = {
        id: getColumnValue(row, headers, columnMap.id) || `RET_${i}`,
        investmentId: getColumnValue(row, headers, columnMap.investmentId) || '',
        returnDate: getColumnValue(row, headers, columnMap.returnDate) || new Date().toISOString().split('T')[0],
        returnAmount: parseFloat(getColumnValue(row, headers, columnMap.returnAmount)) || 0,
        returnType: getColumnValue(row, headers, columnMap.returnType) || 'Interest',
        projectMilestone: getColumnValue(row, headers, columnMap.projectMilestone) || undefined
      };

      if (returnRecord.investmentId) {
        returns.push(returnRecord);
      }
    } catch (error) {
      console.warn(`Error parsing return row ${i}:`, error);
    }
  }

  return returns;
}

// Helper function to get column value by header name
function getColumnValue(row: any[], headers: string[], columnName: string): string {
  const columnIndex = headers.findIndex(header => 
    header && header.toLowerCase().trim() === columnName.toLowerCase()
  );
  
  if (columnIndex === -1) {
    // Try alternative matching
    const altIndex = headers.findIndex(header => 
      header && header.toLowerCase().includes(columnName.toLowerCase())
    );
    return altIndex !== -1 ? (row[altIndex] || '').toString().trim() : '';
  }
  
  return (row[columnIndex] || '').toString().trim();
}

// Validation functions
export function validateInvestorProfile(profile: any): profile is InvestorProfile {
  return profile && 
         typeof profile.id === 'string' && 
         typeof profile.email === 'string' && 
         typeof profile.investorName === 'string';
}

export function validateInvestment(investment: any): investment is Investment {
  return investment && 
         typeof investment.id === 'string' && 
         typeof investment.investorEmail === 'string' && 
         typeof investment.contractorId === 'string';
}

export function validateReturn(returnRecord: any): returnRecord is Return {
  return returnRecord && 
         typeof returnRecord.id === 'string' && 
         typeof returnRecord.investmentId === 'string';
}