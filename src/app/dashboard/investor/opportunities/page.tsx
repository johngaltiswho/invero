'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingSpinner } from '@/components';
import { useInvestor } from '@/contexts/InvestorContext';

interface OpportunityCard {
  id: string;
  projectName: string;
  contractor: string;
  client: string;
  clientType: string;
  sector: string;
  fundingRequired: string;
  projectValue: string;
  expectedIRR: string;
  tenure: string;
  currentProgress?: number;
  teamSize?: number;
  riskRating: string;
  esgRating: string;
  status: string;
  funded: number;
  remainingFunding: string;
  totalInvested: string;
  numberOfInvestors: number;
  milestones: string[];
  highlights: string[];
  esgData?: {
    environmental: {
      wasteReduction: number;
      energyEfficiency: number;
      localSourcing: number;
    };
    social: {
      localEmployment: number;
      skillDevelopment: number;
      safetyCompliance: number;
    };
    governance: {
      transparency: number;
      compliance: number;
      audits: number;
    };
  } | null;
  esgNote?: string;
  fundingNumeric?: number;
  expectedIrrValue?: number | null;
  tenureValue?: number | null;
}

interface ProjectRecord {
  id: string;
  contractor_id: string;
  project_name?: string | null;
  client_name?: string | null;
  funding_required?: number | null;
  project_value?: number | null;
  expected_irr?: number | null;
  project_tenure?: number | null;
  purchase_request_total?: number | null;
  purchase_requests_total?: number | null;
  total_purchase_requests?: number | null;
  total_purchase_value?: number | null;
  status?: string | null;
  project_status?: string | null;
  current_progress?: number | null;
  team_size?: number | null;
  esg_compliance?: string | null;
  risk_level?: string | null;
  next_milestone?: string | null;
  [key: string]: string | number | null | undefined;
}

interface ContractorRecord {
  id: string;
  company_name?: string | null;
  business_category?: string | null;
  risk_rating?: string | null;
  completed_projects?: number | null;
  success_rate?: number | null;
  [key: string]: string | number | null | undefined;
}

export default function InvestmentOpportunities(): React.ReactElement {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [selectedESG, setSelectedESG] = useState('all');
  const { investor, loading } = useInvestor();

  // Generate dynamic opportunities from available contractors and projects
  const generateOpportunities = () => {
    console.log('🔍 Generating opportunities...');
    console.log('Full investor data structure:', investor);
    
    if (!investor) {
      console.log('❌ No investor data available');
      return [];
    }

    // Debug: Log all available data with details
    console.log('Available contractors:', investor.availableOpportunities?.length || 0, investor.availableOpportunities);
    console.log('Related contractors:', investor.relatedContractors?.length || 0, investor.relatedContractors);
    console.log('Related projects:', investor.relatedProjects?.length || 0, investor.relatedProjects);
    console.log('Current investments:', investor.investments?.length || 0, investor.investments);

    // Show ALL projects as opportunities (regardless of investment status)
    const allProjects = investor.allProjects || investor.relatedProjects || [];
    const allContractors = investor.allContractors || investor.relatedContractors || [];
    
    const allActiveProjects = allProjects.filter(project => 
      project.status !== 'Draft'
    );
    
    console.log('📋 Total projects available:', allProjects.length);
    console.log('📋 Active projects for opportunities:', allActiveProjects.length);
    console.log('📋 Total contractors available:', allContractors.length);

    const opportunities: OpportunityCard[] = [];

    // Create opportunities from ALL active projects
    allActiveProjects.forEach((project, index) => {
      console.log(`Processing project ${index + 1}:`, project.project_name, 'from contractor:', project.contractor_id);
      
      // Find the contractor for this project from ALL contractors
      const contractor = allContractors.find(c => c.id === project.contractor_id);
      
      if (!contractor) {
        console.log(`⚠️ No contractor found for project ${project.id} (${project.contractor_id}) - skipping`);
        return; // Skip projects without contractors
      }

      const opportunity = createOpportunityFromProject(project, contractor, index);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    });

    // Helper function to create opportunity from project and contractor
    function createOpportunityFromProject(
      project: ProjectRecord,
      contractor: ContractorRecord,
      index: number
    ): OpportunityCard | null {
      const purchaseRequestTotal =
        project.purchase_request_total ||
        project.purchase_requests_total ||
        project.total_purchase_requests ||
        project.total_purchase_value ||
        0;

      const fundingNumeric = purchaseRequestTotal || project.funding_required || project.project_value || 0;
      const fundingRequired = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(fundingNumeric);
      const projectValueNumeric = project.estimated_value || project.project_value || fundingNumeric;
      const projectValueDisplay = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(projectValueNumeric);
      const expectedIRRDisplay = '--';
      const tenureDisplay = '3-6 months';
      
      // Calculate real funding progress from actual investments
      const allInvestments = investor.investments || [];
      const projectInvestments = allInvestments.filter(inv => inv.project_id === project.id);
      const totalInvested = projectInvestments.reduce((sum, inv) => sum + inv.investment_amount, 0);
      const fundedPercentage = fundingNumeric > 0 ? Math.round((totalInvested / fundingNumeric) * 100) : 0;
      
      // Calculate remaining funding needed
      const remainingFunding = Math.max(0, fundingNumeric - totalInvested);
      
      console.log(`📋 Project ${project.project_name} funding analysis:`, {
        fundingRequired: project.funding_required,
        totalInvested: totalInvested,
        fundedPercentage: fundedPercentage,
        remainingFunding: remainingFunding,
        numberOfInvestors: projectInvestments.length,
        expectedIRR: project.expected_irr,
        projectTenure: project.project_tenure,
        fundingStatus: project.status
      });
      
      // Generate ESG score based on contractor profile
      const esgScore = contractor.business_category?.includes('Engineering') ? 'Gold' : 
                      contractor.business_category?.includes('IT') ? 'Silver' : 'Bronze';

      // Create client name for the opportunity
      const clientName = project.client_name || `${contractor.business_category || 'Industrial'} Client`;
      const projectName = project.project_name || `${contractor.business_category || 'Engineering'} Project`;

      const formatMilestoneDate = (dateValue?: string | null) => {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      };

      const milestones: string[] = [];
      const nextMilestone = project.next_milestone as string | null;
      const nextMilestoneDate = formatMilestoneDate(project.next_milestone_date as string | null);
      if (nextMilestone) {
        milestones.push(nextMilestoneDate ? `${nextMilestone} • ${nextMilestoneDate}` : nextMilestone);
      }
      if (typeof project.current_progress === 'number') {
        milestones.push(`Current progress: ${project.current_progress}%`);
      }
      if (project.project_status) {
        milestones.push(`Status: ${project.project_status}`);
      }
      if (milestones.length === 0) {
        milestones.push('Project milestones will be updated as schedules sync from the contractor.');
      }

      const highlights: string[] = [
        'Project highlights will be updated from contractor reports soon.'
      ];

      const scheduleProgress =
        typeof project.schedule_progress === 'number'
          ? project.schedule_progress
          : typeof project.current_progress === 'number'
          ? project.current_progress
          : 0;

      const opportunity: OpportunityCard = {
        id: `OPP-2025-${String(index + 150).padStart(3, '0')}`,
        projectName: projectName,
        contractor: contractor.company_name,
        client: clientName,
        clientType: ['Tata', 'Mahindra', 'HCL', 'Infosys', 'TCS'].some(mnc => 
          clientName?.includes(mnc)) ? 'MNC' : 'Large Enterprise',
        sector: contractor.business_category || 'Engineering Services',
        fundingRequired,
        projectValue: projectValueDisplay,
        fundingNumeric,
        expectedIrrValue: typeof project.expected_irr === 'number' ? project.expected_irr : null,
        tenureValue: typeof project.project_tenure === 'number' ? project.project_tenure : null,
        expectedIRR: expectedIRRDisplay,
        tenure: tenureDisplay,
        riskRating: project.risk_level || contractor.risk_rating || 'Medium',
        esgRating: project.esg_compliance === 'Yes' ? 'Gold' : esgScore,
        status: project.status || 'Open',
        funded: fundedPercentage,
        remainingFunding: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(remainingFunding),
        totalInvested: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(totalInvested),
        numberOfInvestors: projectInvestments.length,
        currentProgress: scheduleProgress,
        teamSize: project.team_size || 8,
        milestones,
        highlights,
        esgData: null,
        esgNote: 'ESG performance metrics will be published once contractor reporting is synced.'
      };

      console.log(`✅ Created opportunity ${opportunity.id} for ${contractor.company_name} - ${projectName}`);
      return opportunity;
    }

    console.log(`📊 Generated ${opportunities.length} opportunities total`);
    
    return opportunities;
  };

  const opportunities = generateOpportunities();

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-success';
      case 'Medium': return 'text-accent-amber';
      case 'High': return 'text-warning';
      default: return 'text-secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-accent-blue/10 text-accent-blue';
      case 'Funding': return 'bg-accent-amber/10 text-accent-amber';
      case 'Closed': return 'bg-neutral-medium text-secondary';
      default: return 'bg-neutral-medium text-secondary';
    }
  };

  const getESGColor = (rating: string) => {
    switch (rating) {
      case 'Gold': return 'text-accent-amber';
      case 'Silver': return 'text-neutral-light';
      case 'Bronze': return 'text-orange-400';
      default: return 'text-secondary';
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    if (selectedFilter !== 'all' && opp.sector !== selectedFilter) return false;
    if (selectedRisk !== 'all' && opp.riskRating !== selectedRisk) return false;
    if (selectedESG !== 'all' && opp.esgRating !== selectedESG) return false;
    return true;
  });

  const totalFundingRequired = filteredOpportunities.reduce(
    (sum, opportunity) => sum + (opportunity.fundingNumeric ?? 0),
    0
  );

  const irrValues = filteredOpportunities
    .map((opportunity) => opportunity.expectedIrrValue)
    .filter((value): value is number => typeof value === 'number');
  const avgIrrValue = irrValues.length
    ? irrValues.reduce((sum, value) => sum + value, 0) / irrValues.length
    : null;

  const tenureValues = filteredOpportunities
    .map((opportunity) => opportunity.tenureValue)
    .filter((value): value is number => typeof value === 'number');
  const avgTenureValue = tenureValues.length
    ? tenureValues.reduce((sum, value) => sum + value, 0) / tenureValues.length
    : null;

  if (loading) {
    return (
      <DashboardLayout activeTab="opportunities">
        <div className="p-6">
          <LoadingSpinner 
            title="Discovering Investment Opportunities"
            description="Analyzing market data and ESG-compliant projects to find the best investment opportunities for you"
            icon="💼"
            fullScreen={true}
            steps={[
              "Scanning active projects...",
              "Evaluating ESG compliance ratings...",
              "Calculating risk-return profiles..."
            ]}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="opportunities">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">ESG-Integrated Investment Opportunities</h1>
          <p className="text-secondary">
            Curated project financing opportunities with institutional-grade due diligence and ESG compliance verification
          </p>
        </div>

        {/* Filters */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
          <div className="grid md:grid-cols-5 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Sector</label>
              <select 
                value={selectedFilter} 
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              >
                <option value="all">All Sectors</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="IT Services">IT Services</option>
                <option value="Industrial Automation">Industrial Automation</option>
                <option value="Engineering Services">Engineering Services</option>
                <option value="Construction">Construction</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Risk Rating</label>
              <select 
                value={selectedRisk} 
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              >
                <option value="all">All Risk Levels</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">ESG Rating</label>
              <select 
                value={selectedESG} 
                onChange={(e) => setSelectedESG(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              >
                <option value="all">All ESG Ratings</option>
                <option value="Gold">ESG Gold</option>
                <option value="Silver">ESG Silver</option>
                <option value="Bronze">ESG Bronze</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">IRR Range</label>
              <select className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm">
                <option value="all">All IRR Ranges</option>
                <option value="12-14">12-14%</option>
                <option value="14-16">14-16%</option>
                <option value="16+">16%+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Tenure</label>
              <select className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm">
                <option value="all">All Tenures</option>
                <option value="3-6">3-6 months</option>
                <option value="6-9">6-9 months</option>
                <option value="9-12">9-12 months</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-neutral-dark p-4 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-1">AVAILABLE DEALS</div>
            <div className="text-2xl font-bold text-primary">{filteredOpportunities.length}</div>
          </div>
          <div className="bg-neutral-dark p-4 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-1">TOTAL FUNDING</div>
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(totalFundingRequired)}
            </div>
          </div>
          <div className="bg-neutral-dark p-4 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-1">AVG. IRR</div>
            <div className="text-2xl font-bold text-accent-amber">
              {avgIrrValue !== null ? `${avgIrrValue.toFixed(1)}%` : '--'}
            </div>
          </div>
          <div className="bg-neutral-dark p-4 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-1">AVG. TENURE</div>
            <div className="text-2xl font-bold text-primary">
              {avgTenureValue !== null ? `${avgTenureValue.toFixed(1)} months` : '--'}
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-6">
          {filteredOpportunities.length === 0 ? (
            <div className="text-center py-12 bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-lg font-semibold text-primary mb-2">No Opportunities Available</h3>
              <p className="text-secondary">
                {opportunities.length === 0 
                  ? 'No investment opportunities are currently available in your data.'
                  : 'No opportunities match your current filter criteria. Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            filteredOpportunities.map((opportunity) => (
            <div key={opportunity.id} className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2">{opportunity.projectName}</h3>
                    <div className="flex items-center space-x-4 text-sm text-secondary">
                      <span>Contractor: {opportunity.contractor}</span>
                      <span>•</span>
                      <span>Client: {opportunity.client}</span>
                      <span>•</span>
                      <span>{opportunity.clientType}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(opportunity.status)}`}>
                      {opportunity.status}
                    </span>
                    <span className={`text-sm font-semibold ${getRiskColor(opportunity.riskRating)}`}>
                      {opportunity.riskRating} Risk
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-neutral-medium ${getESGColor(opportunity.esgRating)}`}>
                      ESG {opportunity.esgRating}
                    </span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-4 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-secondary mb-1">Project Value</div>
                    <div className="text-lg font-bold text-primary">{opportunity.projectValue}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary mb-1">Funding Required</div>
                    <div className="text-lg font-bold text-primary">{opportunity.fundingRequired}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary mb-1">Expected IRR</div>
                    <div className="text-lg font-bold text-accent-amber">{opportunity.expectedIRR}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary mb-1">Tenure</div>
                    <div className="text-lg font-bold text-primary">{opportunity.tenure}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary">Project Progress (Schedule)</span>
                    <span className="text-primary">
                      {Math.round(opportunity.currentProgress || 0)}% complete
                    </span>
                  </div>
                  <div className="w-full bg-neutral-medium rounded-full h-2 mb-2">
                    <div
                      className="bg-accent-amber h-2 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, opportunity.currentProgress || 0))}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-secondary">
                    Progress is calculated from the latest uploaded project schedule.
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">Project Milestones</h4>
                    <ul className="space-y-2">
                      {opportunity.milestones.map((milestone, index) => (
                        <li key={index} className="text-sm text-secondary flex items-start">
                          <span className="text-accent-amber mr-2">•</span>
                          {milestone}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">Key Highlights</h4>
                    <ul className="space-y-2">
                      {opportunity.highlights.map((highlight, index) => (
                        <li key={index} className="text-sm text-secondary flex items-start">
                          <span className="text-success mr-2">✓</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">ESG Performance</h4>
                    {opportunity.esgData ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-secondary">Environmental</span>
                          <span className="text-xs text-green-400 font-semibold">
                            {opportunity.esgData.environmental.wasteReduction}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-secondary">Social</span>
                          <span className="text-xs text-blue-400 font-semibold">
                            {opportunity.esgData.social.localEmployment}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-secondary">Governance</span>
                          <span className="text-xs text-purple-400 font-semibold">
                            {opportunity.esgData.governance.transparency}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-secondary">
                        {opportunity.esgNote || 'ESG performance will be updated as compliance data becomes available.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-neutral-medium">
                  <div className="text-sm text-secondary">
                    Project ID: {opportunity.id} • Sector: {opportunity.sector}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
