'use client';

import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function InvestorDashboard(): React.ReactElement {
  const portfolioData = {
    totalInvested: '₹2,45,00,000',
    currentValue: '₹2,78,50,000',
    totalReturns: '₹33,50,000',
    irr: '13.7%',
    activeInvestments: 8,
    completedInvestments: 12
  };

  const recentProjects = [
    {
      id: 'INV-2024-089',
      projectName: 'Industrial Automation - ABB Contract',
      contractor: 'TechnoMax Solutions Pvt Ltd',
      investment: '₹50,00,000',
      expectedIRR: '14.2%',
      tenure: '6 months',
      status: 'Active',
      progress: 65,
      nextMilestone: 'System Integration - Dec 15'
    },
    {
      id: 'INV-2024-076',
      projectName: 'Manufacturing Setup - Siemens Project',
      contractor: 'Precision Engineering Corp',
      investment: '₹75,00,000',
      expectedIRR: '12.8%',
      tenure: '8 months',
      status: 'Active',
      progress: 40,
      nextMilestone: 'Equipment Installation - Dec 28'
    },
    {
      id: 'INV-2024-063',
      projectName: 'IT Infrastructure - Bosch Expansion',
      contractor: 'Digital Solutions Ltd',
      investment: '₹35,00,000',
      expectedIRR: '15.1%',
      tenure: '4 months',
      status: 'Completed',
      progress: 100,
      nextMilestone: 'Final Payment Received'
    }
  ];

  const sectorAllocation = [
    { sector: 'Industrial Automation', percentage: 35, amount: '₹85,75,000' },
    { sector: 'Manufacturing', percentage: 28, amount: '₹68,60,000' },
    { sector: 'IT Services', percentage: 22, amount: '₹53,90,000' },
    { sector: 'Engineering Services', percentage: 15, amount: '₹36,75,000' }
  ];

  return (
    <DashboardLayout activeTab="overview">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Portfolio Overview</h1>
          <p className="text-secondary">
            Real-time insights into your project financing investments
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL INVESTED</div>
            <div className="text-2xl font-bold text-primary mb-1">{portfolioData.totalInvested}</div>
            <div className="text-xs text-secondary">Across {portfolioData.activeInvestments + portfolioData.completedInvestments} investments</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CURRENT VALUE</div>
            <div className="text-2xl font-bold text-primary mb-1">{portfolioData.currentValue}</div>
            <div className="text-xs text-success">+{portfolioData.totalReturns} returns</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CURRENT IRR</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">{portfolioData.irr}</div>
            <div className="text-xs text-secondary">Annualized return rate</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">ACTIVE PROJECTS</div>
            <div className="text-2xl font-bold text-primary mb-1">{portfolioData.activeInvestments}</div>
            <div className="text-xs text-secondary">{portfolioData.completedInvestments} completed</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Recent Investments</h2>
                <p className="text-sm text-secondary">Your latest project financing activities</p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="border border-neutral-medium rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-primary mb-1">{project.projectName}</h3>
                          <p className="text-sm text-secondary">{project.contractor}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          project.status === 'Active' 
                            ? 'bg-accent-blue/10 text-accent-blue'
                            : 'bg-success/10 text-success'
                        }`}>
                          {project.status}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-secondary">Investment</div>
                          <div className="font-semibold text-primary">{project.investment}</div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary">Expected IRR</div>
                          <div className="font-semibold text-accent-amber">{project.expectedIRR}</div>
                        </div>
                        <div>
                          <div className="text-xs text-secondary">Tenure</div>
                          <div className="font-semibold text-primary">{project.tenure}</div>
                        </div>
                      </div>
                      
                      {project.status === 'Active' && (
                        <>
                          <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-secondary">Progress</span>
                              <span className="text-primary">{project.progress}%</span>
                            </div>
                            <div className="w-full bg-neutral-medium rounded-full h-2">
                              <div 
                                className="bg-accent-amber h-2 rounded-full" 
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-xs text-secondary">
                            Next: {project.nextMilestone}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sector Allocation */}
          <div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Sector Allocation</h2>
                <p className="text-sm text-secondary">Portfolio distribution by industry</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {sectorAllocation.map((sector, index) => (
                    <div key={sector.sector}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-primary">{sector.sector}</span>
                        <span className="text-sm text-accent-amber">{sector.percentage}%</span>
                      </div>
                      <div className="w-full bg-neutral-medium rounded-full h-2 mb-1">
                        <div 
                          className="bg-accent-amber h-2 rounded-full" 
                          style={{ width: `${sector.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-secondary">{sector.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium mt-6">
              <div className="p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Performance Highlights</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Best Performing Sector</span>
                    <span className="text-sm text-success">IT Services (15.1%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Average Project Duration</span>
                    <span className="text-sm text-primary">6.2 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Success Rate</span>
                    <span className="text-sm text-success">97.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Next Payment</span>
                    <span className="text-sm text-accent-amber">Dec 15, 2024</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}