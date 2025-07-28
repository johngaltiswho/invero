'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components';

export default function InvestmentOpportunities(): React.ReactElement {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');

  const opportunities = [
    {
      id: 'OPP-2024-156',
      projectName: 'Smart Manufacturing Solution - Tata Motors',
      contractor: 'AutoTech Solutions Pvt Ltd',
      client: 'Tata Motors',
      clientType: 'MNC',
      sector: 'Manufacturing',
      fundingRequired: '₹1,25,00,000',
      projectValue: '₹3,50,00,000',
      expectedIRR: '14.8%',
      tenure: '9 months',
      riskRating: 'Low',
      minInvestment: '₹25,00,000',
      status: 'Open',
      funded: 60,
      timeLeft: '12 days',
      milestones: [
        'Equipment Procurement - Month 1',
        'Installation & Setup - Month 3', 
        'Testing & Commissioning - Month 6',
        'Final Delivery - Month 9'
      ],
      highlights: [
        'Pre-approved PO from Tata Motors',
        'Contractor has 15+ years experience',
        'Insurance coverage included',
        'Milestone-based disbursement'
      ]
    },
    {
      id: 'OPP-2024-148',
      projectName: 'Digital Infrastructure Upgrade - HCL Tech',
      contractor: 'CloudEdge Technologies',
      client: 'HCL Technologies',
      clientType: 'Large Enterprise',
      sector: 'IT Services',
      fundingRequired: '₹85,00,000',
      projectValue: '₹2,20,00,000',
      expectedIRR: '16.2%',
      tenure: '6 months',
      riskRating: 'Medium',
      minInvestment: '₹15,00,000',
      status: 'Open',
      funded: 35,
      timeLeft: '8 days',
      milestones: [
        'Infrastructure Assessment - Month 1',
        'System Deployment - Month 3',
        'Migration & Testing - Month 5',
        'Go-Live & Support - Month 6'
      ],
      highlights: [
        'Established client relationship',
        'Fast-track project timeline',
        'High-margin opportunity',
        'Proven technology stack'
      ]
    },
    {
      id: 'OPP-2024-142',
      projectName: 'Industrial Automation - Mahindra Group',
      contractor: 'RoboTech Engineering Ltd',
      client: 'Mahindra & Mahindra',
      clientType: 'MNC',
      sector: 'Industrial Automation',
      fundingRequired: '₹2,00,00,000',
      projectValue: '₹5,80,00,000',
      expectedIRR: '13.5%',
      tenure: '12 months',
      riskRating: 'Low',
      minInvestment: '₹50,00,000',
      status: 'Open',
      funded: 25,
      timeLeft: '18 days',
      milestones: [
        'Design & Planning - Month 2',
        'Equipment Procurement - Month 4',
        'Installation Phase - Month 8',
        'Testing & Handover - Month 12'
      ],
      highlights: [
        'Long-term Mahindra partnership',
        'Government subsidy eligible',
        'Scalable automation solution',
        'Export potential'
      ]
    }
  ];

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

  const filteredOpportunities = opportunities.filter(opp => {
    if (selectedFilter !== 'all' && opp.sector !== selectedFilter) return false;
    if (selectedRisk !== 'all' && opp.riskRating !== selectedRisk) return false;
    return true;
  });

  return (
    <DashboardLayout activeTab="opportunities">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Investment Opportunities</h1>
          <p className="text-secondary">
            Curated project financing opportunities with institutional-grade due diligence
          </p>
        </div>

        {/* Filters */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-6">
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
                <option value="Engineering">Engineering Services</option>
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
          {filteredOpportunities.map((opportunity) => (
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
                  <div className="w-full bg-neutral-medium rounded-full h-2">
                    <div 
                      className="bg-accent-amber h-2 rounded-full" 
                      style={{ width: `${opportunity.funded}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
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
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}