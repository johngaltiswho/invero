// Contractor types for client-side use (no server dependencies)

export interface ContractorProject {
  id: string;
  projectName: string;
  projectValue: number;
  status: 'Active' | 'Planning' | 'On Hold' | 'Delayed' | 'Completing' | 'Completed';
  startDate: string;
  expectedEndDate: string;
  currentProgress?: number;
  nextMilestone?: string;
  nextMilestoneDate?: string;
  clientName?: string;
  teamSize?: number;
  monthlyBurnRate?: number;
  priority?: string;
}

export interface Contractor {
  id: string;
  companyName: string;
  registrationNumber: string;
  panNumber: string;
  gstin: string;
  contactPerson: string;
  email: string;
  phone: string;
  yearsInBusiness: number;
  employeeCount: number;
  annualTurnover: number;
  businessCategory: string;
  specializations: string[];
  completedProjects: number;
  successRate: number;
  averageProjectValue: number;
  creditScore: number;
  riskRating: 'Low' | 'Medium' | 'High';
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  documents: {
    panCard: boolean;
    gstCertificate: boolean;
    incorporationCertificate: boolean;
    bankStatements: boolean;
    financialStatements: boolean;
  };
  currentProjects: ContractorProject[];
  capacityUtilization: number;
  availableCapacity: number;
  nextAvailableDate: string;
}