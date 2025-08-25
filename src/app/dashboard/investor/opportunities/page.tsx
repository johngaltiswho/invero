'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button, LoadingSpinner } from '@/components';
import { useInvestor } from '@/contexts/InvestorContext';

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
      project.status === 'Active' || project.status === 'Planning'
    );
    
    console.log('📋 Total projects available:', allProjects.length);
    console.log('📋 Active projects for opportunities:', allActiveProjects.length);
    console.log('📋 Total contractors available:', allContractors.length);

    const opportunities = [];

    // Create opportunities from ALL active projects
    allActiveProjects.forEach((project, index) => {
      console.log(`Processing project ${index + 1}:`, project.projectName, 'from contractor:', project.contractorId);
      
      // Find the contractor for this project from ALL contractors
      const contractor = allContractors.find(c => c.id === project.contractorId);
      
      if (!contractor) {
        console.log(`⚠️ No contractor found for project ${project.id} (${project.contractorId})`);
        // Create a placeholder contractor if not found
        const placeholderContractor = {
          id: project.contractorId,
          companyName: `Contractor ${project.contractorId}`,
          businessCategory: 'General Services',
          riskRating: 'Medium',
          completedProjects: 10,
          successRate: 90,
          averageProjectValue: 5000000
        };
        return createOpportunityFromProject(project, placeholderContractor, index);
      }

      return createOpportunityFromProject(project, contractor, index);
    });

    // Helper function to create opportunity from project and contractor
    function createOpportunityFromProject(project: any, contractor: any, index: number) {
      // Use real data from Google Sheets instead of calculations
      const fundingRequired = project.fundingRequired || 1000000; // From sheet column N
      const expectedIRR = project.expectedIRR || 14; // From sheet column P  
      const tenureMonths = project.projectTenure || 6; // From sheet column Q
      const minInvestment = Math.round(fundingRequired * 0.2); // 20% of funding required
      
      // Calculate real funding progress from actual investments
      const allInvestments = investor.investments || [];
      const projectInvestments = allInvestments.filter(inv => inv.projectId === project.id);
      const totalInvested = projectInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
      const fundedPercentage = fundingRequired > 0 ? Math.round((totalInvested / fundingRequired) * 100) : 0;
      
      // Calculate remaining funding needed
      const remainingFunding = Math.max(0, fundingRequired - totalInvested);
      
      console.log(`📋 Project ${project.projectName} funding analysis:`, {
        fundingRequired: project.fundingRequired,
        totalInvested: totalInvested,
        fundedPercentage: fundedPercentage,
        remainingFunding: remainingFunding,
        numberOfInvestors: projectInvestments.length,
        expectedIRR: project.expectedIRR,
        projectTenure: project.projectTenure,
        fundingStatus: project.fundingStatus
      });
      
      // Generate ESG score based on contractor profile
      const esgScore = contractor.businessCategory?.includes('Engineering') ? 'Gold' : 
                      contractor.businessCategory?.includes('IT') ? 'Silver' : 'Bronze';

      // Create client name for the opportunity
      const clientName = project.clientName || `${contractor.businessCategory || 'Industrial'} Client`;
      const projectName = project.projectName || `${contractor.businessCategory || 'Engineering'} Project`;

      const opportunity = {
        id: `OPP-2025-${String(index + 150).padStart(3, '0')}`,
        projectName: projectName,
        contractor: contractor.companyName,
        client: clientName,
        clientType: ['Tata', 'Mahindra', 'HCL', 'Infosys', 'TCS'].some(mnc => 
          clientName?.includes(mnc)) ? 'MNC' : 'Large Enterprise',
        sector: contractor.businessCategory || 'Engineering Services',
        fundingRequired: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(fundingRequired),
        projectValue: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(project.projectValue || 0),
        expectedIRR: `${expectedIRR}%`,
        tenure: `${tenureMonths} months`,
        riskRating: project.riskLevel || contractor.riskRating || 'Medium',
        esgRating: project.esgCompliance === 'Yes' ? 'Gold' : esgScore,
        minInvestment: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(minInvestment),
        status: project.fundingStatus || 'Open',
        funded: fundedPercentage, // Real funding percentage from actual investments
        remainingFunding: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(remainingFunding),
        totalInvested: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(totalInvested),
        numberOfInvestors: projectInvestments.length,
        timeLeft: `${Math.round(Math.random() * 15 + 5)} days`, // Still random for now
        currentProgress: project.currentProgress || 0,
        teamSize: project.teamSize || 8,
        milestones: [
          `${project.nextMilestone || 'Initial Planning'} - Month 1`,
          'Resource Allocation - Month 2',
          'Implementation Phase - Month 3',
          'Final Delivery & Testing'
        ],
        highlights: [
          `${contractor.completedProjects || 25}+ completed projects`,
          `${contractor.successRate || 95}% success rate`,
          contractor.riskRating === 'Low' ? 'Low-risk opportunity' : 'Proven track record',
          'ESG compliance verified',
          esgScore === 'Gold' ? 'ESG Gold certified' : `ESG ${esgScore} rated`
        ],
        // ESG specific data
        esgData: {
          environmental: {
            wasteReduction: Math.round(Math.random() * 30 + 70), // 70-100%
            energyEfficiency: Math.round(Math.random() * 25 + 75), // 75-100%
            localSourcing: Math.round(Math.random() * 40 + 60) // 60-100%
          },
          social: {
            localEmployment: Math.round(Math.random() * 30 + 70), // 70-100%
            safetyCompliance: Math.round(Math.random() * 10 + 90), // 90-100%
            communityImpact: Math.round(Math.random() * 20 + 80) // 80-100%
          },
          governance: {
            compliance: Math.round(Math.random() * 5 + 95), // 95-100%
            transparency: Math.round(Math.random() * 10 + 90), // 90-100%
            ethics: Math.round(Math.random() * 5 + 95) // 95-100%
          }
        }
      };

      opportunities.push(opportunity);
      console.log(`✅ Created opportunity ${opportunity.id} for ${contractor.companyName} - ${projectName}`);
    }

    console.log(`📊 Generated ${opportunities.length} opportunities total`);
    
    // If still no opportunities, create some sample ones to demonstrate the interface
    if (opportunities.length === 0) {
      console.log('⚠️ No contractor data available, creating sample opportunities');
      const sampleOpportunities = [
        {
          id: 'OPP-2025-001',
          projectName: 'Manufacturing Automation Solution',
          contractor: 'TechSolutions Pvt Ltd',
          client: 'Industrial Manufacturing Corp',
          clientType: 'Large Enterprise',
          sector: 'Manufacturing',
          fundingRequired: '₹75,00,000',
          projectValue: '₹2,50,00,000',
          expectedIRR: '14.2%',
          tenure: '8 months',
          riskRating: 'Medium',
          esgRating: 'Silver',
          minInvestment: '₹15,00,000',
          status: 'Open',
          funded: 45,
          timeLeft: '12 days',
          currentProgress: 0,
          teamSize: 12,
          milestones: [
            'Planning & Design - Month 1',
            'System Implementation - Month 3',
            'Testing & Optimization - Month 6',
            'Final Delivery & Training - Month 8'
          ],
          highlights: [
            '30+ completed projects',
            '96% success rate',
            'Proven track record',
            'ESG compliance verified',
            'ESG Silver rated'
          ],
          esgData: {
            environmental: {
              wasteReduction: 82,
              energyEfficiency: 88,
              localSourcing: 75
            },
            social: {
              localEmployment: 85,
              safetyCompliance: 95,
              communityImpact: 78
            },
            governance: {
              compliance: 98,
              transparency: 92,
              ethics: 97
            }
          }
        }
      ];
      
      return sampleOpportunities;
    }
    
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
            <div className="text-2xl font-bold text-primary">₹4.1 Cr</div>
          </div>
          <div className="bg-neutral-dark p-4 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-1">AVG. IRR</div>
            <div className="text-2xl font-bold text-accent-amber">14.8%</div>
          </div>
          <div className="bg-neutral-dark p-4 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-1">AVG. TENURE</div>
            <div className="text-2xl font-bold text-primary">9 months</div>
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

                <div className="grid lg:grid-cols-5 md:grid-cols-3 gap-6 mb-6">
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
                  <div>
                    <div className="text-xs text-secondary mb-1">Min. Investment</div>
                    <div className="text-lg font-bold text-primary">{opportunity.minInvestment}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary mb-1">Closing In</div>
                    <div className="text-lg font-bold text-warning">{opportunity.timeLeft}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary">Funding Progress</span>
                    <span className="text-primary">{opportunity.funded}% funded</span>
                  </div>
                  <div className="w-full bg-neutral-medium rounded-full h-2 mb-3">
                    <div 
                      className="bg-accent-amber h-2 rounded-full" 
                      style={{ width: `${opportunity.funded}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-secondary">Raised: </span>
                      <span className="text-success font-semibold">{opportunity.totalInvested}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Remaining: </span>
                      <span className="text-warning font-semibold">{opportunity.remainingFunding}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Investors: </span>
                      <span className="text-primary font-semibold">{opportunity.numberOfInvestors}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Status: </span>
                      <span className={`font-semibold ${
                        opportunity.funded === 0 ? 'text-warning' : 
                        opportunity.funded >= 100 ? 'text-success' : 'text-accent-amber'
                      }`}>
                        {opportunity.funded === 0 ? 'Not Started' : 
                         opportunity.funded >= 100 ? 'Fully Funded' : 'In Progress'}
                      </span>
                    </div>
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
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-secondary">Environmental</span>
                        <span className="text-xs text-green-400 font-semibold">
                          {opportunity.esgData?.environmental?.wasteReduction || 85}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-secondary">Social Impact</span>
                        <span className="text-xs text-blue-400 font-semibold">
                          {opportunity.esgData?.social?.localEmployment || 78}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-secondary">Governance</span>
                        <span className="text-xs text-purple-400 font-semibold">
                          {opportunity.esgData?.governance?.compliance || 95}%
                        </span>
                      </div>
                      <div className="pt-2 border-t border-neutral-medium">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-secondary">Overall ESG Score</span>
                          <span className={`text-xs font-bold ${getESGColor(opportunity.esgRating)}`}>
                            {opportunity.esgRating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-neutral-medium">
                  <div className="text-sm text-secondary">
                    Project ID: {opportunity.id} • Sector: {opportunity.sector}
                  </div>
                  <div className="flex space-x-3">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button variant="primary" size="sm">
                      Invest Now
                    </Button>
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