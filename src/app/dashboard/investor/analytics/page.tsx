'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { mockInvestments, mockProjects, getProjectById } from '@/data/mockData';

export default function PerformanceAnalytics(): React.ReactElement {
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('irr');

  // Performance data for charts
  const performanceData = {
    '6months': [
      { month: 'Jul', irr: 12.5, invested: 5000000, returns: 250000 },
      { month: 'Aug', irr: 13.2, invested: 7500000, returns: 495000 },
      { month: 'Sep', irr: 14.1, invested: 12000000, returns: 846000 },
      { month: 'Oct', irr: 13.8, invested: 17500000, returns: 1207500 },
      { month: 'Nov', irr: 14.5, invested: 22000000, returns: 1595000 },
      { month: 'Dec', irr: 13.7, invested: 24500000, returns: 1678250 }
    ],
    '12months': [
      { month: 'Jan', irr: 11.8, invested: 2000000, returns: 118000 },
      { month: 'Feb', irr: 12.3, invested: 3500000, returns: 214750 },
      { month: 'Mar', irr: 13.1, invested: 4500000, returns: 294750 },
      { month: 'Apr', irr: 12.9, invested: 6000000, returns: 387000 },
      { month: 'May', irr: 13.5, invested: 8500000, returns: 573750 },
      { month: 'Jun', irr: 12.8, invested: 11000000, returns: 704000 },
      { month: 'Jul', irr: 12.5, invested: 15000000, returns: 937500 },
      { month: 'Aug', irr: 13.2, invested: 17500000, returns: 1155000 },
      { month: 'Sep', irr: 14.1, invested: 19000000, returns: 1339500 },
      { month: 'Oct', irr: 13.8, invested: 21500000, returns: 1482750 },
      { month: 'Nov', irr: 14.5, invested: 23000000, returns: 1667500 },
      { month: 'Dec', irr: 13.7, invested: 24500000, returns: 1678250 }
    ]
  };

  const sectorPerformance = [
    { sector: 'IT Services', irr: 15.8, risk: 'Medium', projects: 5, invested: 5390000 },
    { sector: 'Industrial Automation', irr: 14.2, risk: 'Low', projects: 8, invested: 8575000 },
    { sector: 'Manufacturing', irr: 13.5, risk: 'Low', projects: 6, invested: 6860000 },
    { sector: 'Engineering Services', irr: 12.8, risk: 'Medium', projects: 3, invested: 3675000 }
  ];

  const riskMetrics = {
    portfolioVaR: '2.8%',
    sharpeRatio: '1.42',
    maxDrawdown: '1.2%',
    volatility: '8.5%',
    correlation: '0.31'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const currentData = performanceData[selectedTimeframe as keyof typeof performanceData];
  const maxValue = Math.max(...currentData.map(d => selectedMetric === 'irr' ? d.irr : selectedMetric === 'invested' ? d.invested : d.returns));

  return (
    <DashboardLayout activeTab="analytics">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Performance Analytics</h1>
          <p className="text-secondary">
            Comprehensive analysis of your investment performance and risk metrics
          </p>
        </div>

        {/* Controls */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Timeframe</label>
              <select 
                value={selectedTimeframe} 
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              >
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Primary Metric</label>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm"
              >
                <option value="irr">IRR Performance</option>
                <option value="invested">Cumulative Investment</option>
                <option value="returns">Returns Generated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Analysis Type</label>
              <select className="w-full px-3 py-2 bg-neutral-medium border border-neutral-light rounded text-primary text-sm">
                <option value="portfolio">Portfolio View</option>
                <option value="sector">Sector Analysis</option>
                <option value="risk">Risk Analysis</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid lg:grid-cols-5 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">CURRENT IRR</div>
            <div className="text-2xl font-bold text-primary mb-1">13.7%</div>
            <div className="text-xs text-success">+0.3% vs last month</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">TOTAL RETURNS</div>
            <div className="text-2xl font-bold text-primary mb-1">₹33.5L</div>
            <div className="text-xs text-success">+₹2.1L this month</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">SHARPE RATIO</div>
            <div className="text-2xl font-bold text-accent-amber mb-1">{riskMetrics.sharpeRatio}</div>
            <div className="text-xs text-secondary">Risk-adjusted returns</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">VOLATILITY</div>
            <div className="text-2xl font-bold text-primary mb-1">{riskMetrics.volatility}</div>
            <div className="text-xs text-success">Low volatility</div>
          </div>
          
          <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="text-accent-amber text-sm font-mono mb-2">VALUE AT RISK</div>
            <div className="text-2xl font-bold text-warning mb-1">{riskMetrics.portfolioVaR}</div>
            <div className="text-xs text-secondary">95% confidence</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Performance Chart */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary mb-2">Performance Trend</h2>
                <p className="text-sm text-secondary">
                  {selectedMetric === 'irr' ? 'IRR progression over time' : 
                   selectedMetric === 'invested' ? 'Cumulative investment amount' : 
                   'Returns generated over time'}
                </p>
              </div>
              <div className="p-6">
                {/* Simple chart representation */}
                <div className="space-y-4">
                  {currentData.map((point, index) => {
                    const value = selectedMetric === 'irr' ? point.irr : 
                                selectedMetric === 'invested' ? point.invested : point.returns;
                    const percentage = (value / maxValue) * 100;
                    
                    return (
                      <div key={point.month} className="flex items-center space-x-4">
                        <div className="w-12 text-sm text-secondary">{point.month}</div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-primary">
                              {selectedMetric === 'irr' ? `${value}%` : formatCurrency(value)}
                            </span>
                            <span className="text-xs text-secondary">
                              {Math.round(percentage)}% of max
                            </span>
                          </div>
                          <div className="w-full bg-neutral-medium rounded-full h-2">
                            <div 
                              className="bg-accent-amber h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sector Performance */}
          <div>
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium">
              <div className="p-6 border-b border-neutral-medium">
                <h2 className="text-xl font-bold text-primary">Sector Performance</h2>
                <p className="text-sm text-secondary">IRR by sector allocation</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {sectorPerformance.map((sector) => (
                    <div key={sector.sector}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="text-sm font-medium text-primary">{sector.sector}</div>
                          <div className="text-xs text-secondary">{sector.projects} projects</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-accent-amber">{sector.irr}%</div>
                          <div className={`text-xs ${
                            sector.risk === 'Low' ? 'text-success' : 'text-accent-amber'
                          }`}>
                            {sector.risk} Risk
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-medium rounded-full h-2 mb-1">
                        <div 
                          className="bg-accent-amber h-2 rounded-full" 
                          style={{ width: `${(sector.irr / 16) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-secondary">{formatCurrency(sector.invested)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="bg-neutral-dark rounded-lg border border-neutral-medium mt-6">
              <div className="p-6 border-b border-neutral-medium">
                <h3 className="text-lg font-bold text-primary">Risk Analysis</h3>
                <p className="text-sm text-secondary">Portfolio risk metrics</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Value at Risk (95%)</span>
                    <span className="text-sm text-warning font-medium">{riskMetrics.portfolioVaR}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Sharpe Ratio</span>
                    <span className="text-sm text-success font-medium">{riskMetrics.sharpeRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Max Drawdown</span>
                    <span className="text-sm text-success font-medium">{riskMetrics.maxDrawdown}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Volatility</span>
                    <span className="text-sm text-primary font-medium">{riskMetrics.volatility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Correlation to Market</span>
                    <span className="text-sm text-success font-medium">{riskMetrics.correlation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analytics Table */}
        <div className="bg-neutral-dark rounded-lg border border-neutral-medium mt-8">
          <div className="p-6 border-b border-neutral-medium">
            <h2 className="text-xl font-bold text-primary">Investment Performance Details</h2>
            <p className="text-sm text-secondary">Individual investment performance breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-medium">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-primary">Project</th>
                  <th className="text-left p-4 text-sm font-medium text-primary">Sector</th>
                  <th className="text-right p-4 text-sm font-medium text-primary">Investment</th>
                  <th className="text-right p-4 text-sm font-medium text-primary">Expected IRR</th>
                  <th className="text-right p-4 text-sm font-medium text-primary">Current IRR</th>
                  <th className="text-right p-4 text-sm font-medium text-primary">Returns</th>
                  <th className="text-center p-4 text-sm font-medium text-primary">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockInvestments.map((investment) => {
                  const project = getProjectById(investment.projectId);
                  const currentIRR = investment.status === 'Active' ? investment.irr : 
                                   investment.actualReturns ? 
                                   ((investment.actualReturns - investment.amount) / investment.amount) * 100 : 
                                   investment.irr;
                  
                  return (
                    <tr key={investment.id} className="border-b border-neutral-medium">
                      <td className="p-4">
                        <div className="text-sm font-medium text-primary">{project?.projectName}</div>
                        <div className="text-xs text-secondary">{investment.id}</div>
                      </td>
                      <td className="p-4 text-sm text-secondary">{project?.sector}</td>
                      <td className="p-4 text-sm text-primary text-right">{formatCurrency(investment.amount)}</td>
                      <td className="p-4 text-sm text-accent-amber text-right">{investment.irr}%</td>
                      <td className="p-4 text-sm text-primary text-right">
                        <span className={currentIRR >= investment.irr ? 'text-success' : 'text-warning'}>
                          {currentIRR.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-sm text-primary text-right">
                        {investment.actualReturns ? formatCurrency(investment.actualReturns) : 
                         formatCurrency(investment.expectedReturns)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          investment.status === 'Active' ? 'bg-accent-blue/10 text-accent-blue' :
                          investment.status === 'Matured' ? 'bg-success/10 text-success' :
                          'bg-warning/10 text-warning'
                        }`}>
                          {investment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}