// Unified data model for Invero platform - ready for backend integration

export interface Client {
  id: string;
  name: string;
  type: 'MNC' | 'Large Enterprise' | 'Government' | 'PSU' | 'SME';
  industry: string;
  creditRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB';
  paymentHistory: 'Excellent' | 'Good' | 'Average';
  avgPaymentCycle: number; // days
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
  capacityUtilization: number; // percentage of current capacity being used
  availableCapacity: number; // remaining project value capacity
  nextAvailableDate: string; // when contractor will be available for new projects
}

export interface ContractorProject {
  id: string;
  contractorId: string;
  projectName: string;
  clientName: string;
  projectValue: number;
  startDate: string;
  expectedEndDate: string;
  currentProgress: number; // percentage
  status: 'Planning' | 'Active' | 'On Hold' | 'Delayed' | 'Completing';
  priority: 'High' | 'Medium' | 'Low';
  nextMilestone: string;
  nextMilestoneDate: string;
  teamSize: number;
  monthlyBurnRate: number; // monthly expenses for this project
}

export interface Project {
  id: string;
  projectName: string;
  clientId: string;
  contractorId: string;
  sector: string;
  projectValue: number;
  fundingRequired: number;
  fundingReceived: number;
  expectedIRR: number;
  tenure: number; // months
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  riskRating: 'Low' | 'Medium' | 'High';
  progress: number; // percentage
  milestones: Milestone[];
  paymentTerms: string;
  contractDate: string;
  description: string;
  minInvestment: number;
  currentInvestors: string[];
  documents: {
    contract: boolean;
    purchaseOrder: boolean;
    insurance: boolean;
    permits: boolean;
  };
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  expectedDate: string;
  actualDate?: string;
  percentage: number;
  paymentPercentage: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
  dependencies: string[];
}

export interface Investment {
  id: string;
  investorId: string;
  projectId: string;
  amount: number;
  investmentDate: string;
  expectedReturns: number;
  actualReturns?: number;
  status: 'Active' | 'Matured' | 'Early Exit';
  irr: number;
  payouts: Payout[];
}

export interface Payout {
  id: string;
  amount: number;
  date: string;
  type: 'Interest' | 'Principal' | 'Milestone' | 'Final';
  status: 'Scheduled' | 'Processed' | 'Delayed';
}

export interface Investor {
  id: string;
  name: string;
  email: string;
  phone: string;
  investorType: 'Individual' | 'HNI' | 'Family Office' | 'Institutional';
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  riskAppetite: 'Conservative' | 'Moderate' | 'Aggressive';
  preferredSectors: string[];
  minInvestment: number;
  maxInvestment: number;
  kycStatus: 'Pending' | 'Verified' | 'Rejected';
  accreditation: 'Retail' | 'HNI' | 'Qualified Institutional';
}

// Mock data for development
export const mockClients: Client[] = [
  {
    id: 'CLIENT_001',
    name: 'Tata Motors',
    type: 'MNC',
    industry: 'Automotive',
    creditRating: 'AAA',
    paymentHistory: 'Excellent',
    avgPaymentCycle: 45
  },
  {
    id: 'CLIENT_002',
    name: 'HCL Technologies',
    type: 'MNC',
    industry: 'IT Services',
    creditRating: 'AA',
    paymentHistory: 'Excellent',
    avgPaymentCycle: 30
  },
  {
    id: 'CLIENT_003',
    name: 'Mahindra & Mahindra',
    type: 'MNC',
    industry: 'Manufacturing',
    creditRating: 'AA',
    paymentHistory: 'Excellent',
    avgPaymentCycle: 60
  },
  {
    id: 'CLIENT_004',
    name: 'Bosch India',
    type: 'MNC',
    industry: 'Engineering',
    creditRating: 'AAA',
    paymentHistory: 'Excellent',
    avgPaymentCycle: 35
  },
  {
    id: 'CLIENT_005',
    name: 'Siemens India',
    type: 'MNC',
    industry: 'Industrial Technology',
    creditRating: 'AAA',
    paymentHistory: 'Excellent',
    avgPaymentCycle: 40
  }
];

export const mockContractors: any[] = [
  {
    id: 'CONTRACTOR_001',
    companyName: 'TechnoMax Solutions Pvt Ltd',
    registrationNumber: 'U72900DL2010PTC198765',
    gstin: '07AABCT1234E1Z5',
    contactPerson: 'Amit Sharma',
    email: 'amit.sharma@technomax.in',
    phone: '+91-9876543210',
    yearsInBusiness: 15,
    employeeCount: 125,
    annualTurnover: 45000000,
    businessCategory: 'Industrial Automation',
    specializations: ['Manufacturing Automation', 'IoT Solutions', 'Process Optimization'],
    completedProjects: 89,
    successRate: 97.8,
    averageProjectValue: 3500000,
    creditScore: 785,
    riskRating: 'Low',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountNumber: '50100123456789',
      ifscCode: 'HDFC0001234'
    },
    documents: {
      panCard: true,
      gstCertificate: true,
      incorporationCertificate: true,
      bankStatements: true,
      financialStatements: true
    }
  },
  {
    id: 'CONTRACTOR_002',
    companyName: 'CloudEdge Technologies',
    registrationNumber: 'U72200KA2015PTC087654',
    gstin: '29AABCT5678F1Z8',
    contactPerson: 'Priya Patel',
    email: 'priya.patel@cloudedge.in',
    phone: '+91-9123456789',
    yearsInBusiness: 9,
    employeeCount: 85,
    annualTurnover: 28000000,
    businessCategory: 'IT Services',
    specializations: ['Cloud Migration', 'Digital Infrastructure', 'DevOps'],
    completedProjects: 156,
    successRate: 95.2,
    averageProjectValue: 2200000,
    creditScore: 720,
    riskRating: 'Medium',
    bankDetails: {
      bankName: 'ICICI Bank',
      accountNumber: '012345678901',
      ifscCode: 'ICIC0001234'
    },
    documents: {
      panCard: true,
      gstCertificate: true,
      incorporationCertificate: true,
      bankStatements: true,
      financialStatements: true
    }
  },
  {
    id: 'CONTRACTOR_003',
    companyName: 'RoboTech Engineering Ltd',
    registrationNumber: 'L29299MH2008PLC189876',
    gstin: '27AABCR9876A1Z3',
    contactPerson: 'Rajesh Kumar',
    email: 'rajesh.kumar@robotech.in',
    phone: '+91-9988776655',
    yearsInBusiness: 16,
    employeeCount: 200,
    annualTurnover: 75000000,
    businessCategory: 'Industrial Automation',
    specializations: ['Robotics', 'Industrial Automation', 'AI/ML Integration'],
    completedProjects: 134,
    successRate: 98.5,
    averageProjectValue: 5800000,
    creditScore: 810,
    riskRating: 'Low',
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '123456789012',
      ifscCode: 'SBIN0001234'
    },
    documents: {
      panCard: true,
      gstCertificate: true,
      incorporationCertificate: true,
      bankStatements: true,
      financialStatements: true
    }
  }
];

export const mockProjects: Project[] = [
  {
    id: 'PROJ_2024_156',
    projectName: 'Smart Manufacturing Solution - Tata Motors',
    clientId: 'CLIENT_001',
    contractorId: 'CONTRACTOR_001',
    sector: 'Manufacturing',
    projectValue: 35000000,
    fundingRequired: 12500000,
    fundingReceived: 7500000,
    expectedIRR: 14.8,
    tenure: 9,
    startDate: '2024-10-01',
    expectedEndDate: '2025-06-30',
    status: 'Active',
    riskRating: 'Low',
    progress: 65,
    paymentTerms: '30% advance, 40% on milestones, 30% on completion',
    contractDate: '2024-09-15',
    description: 'Implementation of smart manufacturing solution including IoT sensors, automation systems, and predictive maintenance capabilities for Tata Motors production line.',
    minInvestment: 2500000,
    currentInvestors: ['INV_001', 'INV_002', 'INV_003'],
    milestones: [
      {
        id: 'MS_001',
        name: 'Equipment Procurement',
        description: 'Procurement of IoT sensors and automation hardware',
        expectedDate: '2024-11-01',
        actualDate: '2024-10-28',
        percentage: 25,
        paymentPercentage: 30,
        status: 'Completed',
        dependencies: []
      },
      {
        id: 'MS_002',
        name: 'System Integration',
        description: 'Integration of sensors with existing manufacturing systems',
        expectedDate: '2024-12-15',
        percentage: 40,
        paymentPercentage: 30,
        status: 'In Progress',
        dependencies: ['MS_001']
      },
      {
        id: 'MS_003',
        name: 'Testing & Commissioning',
        description: 'System testing and commissioning',
        expectedDate: '2025-03-01',
        percentage: 25,
        paymentPercentage: 25,
        status: 'Pending',
        dependencies: ['MS_002']
      },
      {
        id: 'MS_004',
        name: 'Final Delivery',
        description: 'Final delivery and documentation handover',
        expectedDate: '2025-06-30',
        percentage: 10,
        paymentPercentage: 15,
        status: 'Pending',
        dependencies: ['MS_003']
      }
    ],
    documents: {
      contract: true,
      purchaseOrder: true,
      insurance: true,
      permits: true
    }
  },
  {
    id: 'PROJ_2024_148',
    projectName: 'Digital Infrastructure Upgrade - HCL Tech',
    clientId: 'CLIENT_002',
    contractorId: 'CONTRACTOR_002',
    sector: 'IT Services',
    projectValue: 22000000,
    fundingRequired: 8500000,
    fundingReceived: 2975000,
    expectedIRR: 16.2,
    tenure: 6,
    startDate: '2024-11-15',
    expectedEndDate: '2025-05-15',
    status: 'Active',
    riskRating: 'Medium',
    progress: 40,
    paymentTerms: '25% advance, 50% on milestones, 25% on completion',
    contractDate: '2024-11-01',
    description: 'Complete digital infrastructure upgrade including cloud migration, security implementation, and DevOps pipeline setup for HCL Technologies.',
    minInvestment: 1500000,
    currentInvestors: ['INV_001', 'INV_004'],
    milestones: [
      {
        id: 'MS_005',
        name: 'Infrastructure Assessment',
        description: 'Complete assessment of existing infrastructure',
        expectedDate: '2024-12-15',
        actualDate: '2024-12-10',
        percentage: 20,
        paymentPercentage: 25,
        status: 'Completed',
        dependencies: []
      },
      {
        id: 'MS_006',
        name: 'System Deployment',
        description: 'Deployment of new cloud infrastructure',
        expectedDate: '2025-02-15',
        percentage: 40,
        paymentPercentage: 35,
        status: 'In Progress',
        dependencies: ['MS_005']
      },
      {
        id: 'MS_007',
        name: 'Migration & Testing',
        description: 'Data migration and comprehensive testing',
        expectedDate: '2025-04-15',
        percentage: 30,
        paymentPercentage: 25,
        status: 'Pending',
        dependencies: ['MS_006']
      },
      {
        id: 'MS_008',
        name: 'Go-Live & Support',
        description: 'Go-live and post-deployment support',
        expectedDate: '2025-05-15',
        percentage: 10,
        paymentPercentage: 15,
        status: 'Pending',
        dependencies: ['MS_007']
      }
    ],
    documents: {
      contract: true,
      purchaseOrder: true,
      insurance: true,
      permits: false
    }
  },
  {
    id: 'PROJ_2024_142',
    projectName: 'Industrial Automation - Mahindra Group',
    clientId: 'CLIENT_003',
    contractorId: 'CONTRACTOR_003',
    sector: 'Industrial Automation',
    projectValue: 58000000,
    fundingRequired: 20000000,
    fundingReceived: 5000000,
    expectedIRR: 13.5,
    tenure: 12,
    startDate: '2025-01-01',
    expectedEndDate: '2025-12-31',
    status: 'Planning',
    riskRating: 'Low',
    progress: 25,
    paymentTerms: '20% advance, 60% on milestones, 20% on completion',
    contractDate: '2024-12-01',
    description: 'Complete industrial automation solution including robotic systems, AI-powered quality control, and integrated manufacturing execution system for Mahindra Group.',
    minInvestment: 5000000,
    currentInvestors: ['INV_002'],
    milestones: [
      {
        id: 'MS_009',
        name: 'Design & Planning',
        description: 'Detailed design and project planning phase',
        expectedDate: '2025-02-28',
        percentage: 15,
        paymentPercentage: 20,
        status: 'In Progress',
        dependencies: []
      },
      {
        id: 'MS_010',
        name: 'Equipment Procurement',
        description: 'Procurement of robotic systems and automation equipment',
        expectedDate: '2025-04-30',
        percentage: 25,
        paymentPercentage: 25,
        status: 'Pending',
        dependencies: ['MS_009']
      },
      {
        id: 'MS_011',
        name: 'Installation Phase',
        description: 'Installation and setup of automation systems',
        expectedDate: '2025-08-31',
        percentage: 40,
        paymentPercentage: 35,
        status: 'Pending',
        dependencies: ['MS_010']
      },
      {
        id: 'MS_012',
        name: 'Testing & Handover',
        description: 'System testing and final handover',
        expectedDate: '2025-12-31',
        percentage: 20,
        paymentPercentage: 20,
        status: 'Pending',
        dependencies: ['MS_011']
      }
    ],
    documents: {
      contract: true,
      purchaseOrder: true,
      insurance: false,
      permits: false
    }
  }
];

export const mockInvestors: Investor[] = [
  {
    id: 'INV_001',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@email.com',
    phone: '+91-9876543210',
    investorType: 'HNI',
    totalInvested: 24500000,
    currentValue: 27850000,
    totalReturns: 3350000,
    riskAppetite: 'Moderate',
    preferredSectors: ['Manufacturing', 'IT Services', 'Industrial Automation'],
    minInvestment: 1000000,
    maxInvestment: 10000000,
    kycStatus: 'Verified',
    accreditation: 'HNI'
  },
  {
    id: 'INV_002',
    name: 'Priya Mehta',
    email: 'priya.mehta@email.com',
    phone: '+91-9123456789',
    investorType: 'Family Office',
    totalInvested: 85000000,
    currentValue: 96500000,
    totalReturns: 11500000,
    riskAppetite: 'Aggressive',
    preferredSectors: ['Industrial Automation', 'Engineering Services'],
    minInvestment: 5000000,
    maxInvestment: 25000000,
    kycStatus: 'Verified',
    accreditation: 'Qualified Institutional'
  }
];

export const mockInvestments: Investment[] = [
  {
    id: 'INV_PROJ_001',
    investorId: 'INV_001',
    projectId: 'PROJ_2024_156',
    amount: 5000000,
    investmentDate: '2024-10-01',
    expectedReturns: 5740000,
    status: 'Active',
    irr: 14.8,
    payouts: [
      {
        id: 'PAYOUT_001',
        amount: 150000,
        date: '2024-11-30',
        type: 'Interest',
        status: 'Processed'
      },
      {
        id: 'PAYOUT_002',
        amount: 150000,
        date: '2024-12-31',
        type: 'Interest',
        status: 'Scheduled'
      }
    ]
  },
  {
    id: 'INV_PROJ_002',
    investorId: 'INV_001',
    projectId: 'PROJ_2024_148',
    amount: 2500000,
    investmentDate: '2024-11-15',
    expectedReturns: 2905000,
    status: 'Active',
    irr: 16.2,
    payouts: [
      {
        id: 'PAYOUT_003',
        amount: 135000,
        date: '2024-12-31',
        type: 'Interest',
        status: 'Scheduled'
      }
    ]
  }
];

// Helper functions for data retrieval
export const getClientById = (id: string): Client | undefined => {
  return mockClients.find(client => client.id === id);
};

// Legacy function for backward compatibility - now supports Google Sheets
export const getContractorById = (id: string): Contractor | undefined => {
  return mockContractors.find(contractor => contractor.id === id);
};

// New Google Sheets integration functions (client-side)
export { fetchContractors, getContractorById as getContractorByIdAsync, getContractorsByCategory, getContractorsBySpecialization, clearContractorCache } from '@/lib/contractor-client';

export const getProjectById = (id: string): Project | undefined => {
  return mockProjects.find(project => project.id === id);
};

export const getInvestorById = (id: string): Investor | undefined => {
  return mockInvestors.find(investor => investor.id === id);
};

export const getProjectsByContractor = (contractorId: string): Project[] => {
  return mockProjects.filter(project => project.contractorId === contractorId);
};

export const getProjectsByInvestor = (investorId: string): Project[] => {
  const investments = mockInvestments.filter(inv => inv.investorId === investorId);
  return investments.map(inv => getProjectById(inv.projectId)).filter(Boolean) as Project[];
};

export const getInvestmentsByProject = (projectId: string): Investment[] => {
  return mockInvestments.filter(inv => inv.projectId === projectId);
};