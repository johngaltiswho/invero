'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function ContractorComparePage() {
  const [projectValue, setProjectValue] = useState(10000000); // 1 Cr default
  
  // Calculations
  const materialCost = projectValue * 0.4; // 40% material cost
  const loanAmount = materialCost;
  
  // Traditional Loan (18% for 36 months)
  const loanRate = 0.18;
  const loanTenure = 36;
  const monthlyLoanPayment = (loanAmount * (loanRate/12) * Math.pow(1 + loanRate/12, loanTenure)) / (Math.pow(1 + loanRate/12, loanTenure) - 1);
  const totalLoanPayment = monthlyLoanPayment * loanTenure;
  const loanInterest = totalLoanPayment - loanAmount;
  
  // Finverno Supply (36% effective but 90 days)
  const supplyRate = 0.36;
  const supplyDays = 90;
  const supplyInterest = loanAmount * (supplyRate * supplyDays / 365);
  const totalSupplyPayment = loanAmount + supplyInterest;
  
  const savings = loanInterest - supplyInterest;
  const savingsPercentage = ((savings / loanInterest) * 100);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
            SMART MATERIAL FINANCING
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6 leading-tight">
            Why Pay <span className="text-red-500">18% for 3 Years</span> When You Can Pay 
            <span className="text-accent-orange block">36% for 90 Days?</span>
          </h1>
          <p className="text-xl text-secondary max-w-4xl mx-auto mb-8 leading-relaxed">
            Traditional business loans lock you into long-term debt. Our contract-backed material supply lets you 
            pay higher rates for much shorter periods, saving you significant money overall.
          </p>
          <div className="bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg p-6 max-w-2xl mx-auto border border-green-600/30">
            <p className="text-2xl font-bold text-green-400">
              Save up to ₹{Math.round(savings/100000)} Lakhs per project
            </p>
            <p className="text-green-300 text-sm mt-2">Based on typical infrastructure project financing</p>
          </div>
        </div>

        {/* Interactive Calculator */}
        <div className="bg-neutral-dark rounded-xl p-8 mb-16 border border-neutral-medium">
          <h2 className="text-3xl font-bold text-primary text-center mb-8">Project Financing Calculator</h2>
          
          {/* Project Value Input */}
          <div className="max-w-md mx-auto mb-8">
            <label className="block text-secondary text-sm font-medium mb-2">
              Project Value (₹)
            </label>
            <input
              type="number"
              value={projectValue}
              onChange={(e) => setProjectValue(Number(e.target.value))}
              className="w-full bg-neutral-medium text-primary border border-neutral-light rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent-orange focus:border-transparent"
              placeholder="Enter project value"
            />
            <p className="text-xs text-secondary mt-1">Material cost estimated at 40% of project value</p>
          </div>

          {/* Comparison Cards */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Traditional Loan */}
            <div className="bg-red-900/20 border-2 border-red-600/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-red-400">Traditional Business Loan</h3>
                <div className="bg-red-600/20 px-3 py-1 rounded-full">
                  <span className="text-red-300 text-sm font-medium">18% APR</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-secondary">Loan Amount:</span>
                  <span className="text-primary font-bold">₹{(loanAmount/10000000).toFixed(1)} Cr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Interest Rate:</span>
                  <span className="text-red-400 font-bold">18% per annum</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Tenure:</span>
                  <span className="text-red-400 font-bold">36 months (locked)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Monthly EMI:</span>
                  <span className="text-primary">₹{Math.round(monthlyLoanPayment/100000)} L</span>
                </div>
                <div className="border-t border-red-600/30 pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="text-secondary">Total Interest:</span>
                    <span className="text-red-400 font-bold">₹{(loanInterest/10000000).toFixed(2)} Cr</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-secondary">Total Payment:</span>
                    <span className="text-red-400 font-bold">₹{(totalLoanPayment/10000000).toFixed(2)} Cr</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-red-800/20 rounded-lg p-4">
                <h4 className="font-semibold text-red-400 mb-2">Loan Constraints:</h4>
                <ul className="text-sm text-secondary space-y-1">
                  <li>• Lengthy approval process (2-4 weeks)</li>
                  <li>• Requires substantial collateral</li>
                  <li>• Fixed repayment regardless of project cash flow</li>
                  <li>• Affects credit utilization for other opportunities</li>
                </ul>
              </div>
            </div>

            {/* Finverno Supply */}
            <div className="bg-green-900/20 border-2 border-green-600/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-green-400">Finverno Material Supply</h3>
                <div className="bg-green-600/20 px-3 py-1 rounded-full">
                  <span className="text-green-300 text-sm font-medium">36% APR</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-secondary">Supply Value:</span>
                  <span className="text-primary font-bold">₹{(materialCost/10000000).toFixed(1)} Cr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Effective Rate:</span>
                  <span className="text-green-400 font-bold">36% per annum</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Payment Period:</span>
                  <span className="text-green-400 font-bold">90 days (flexible)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Linked to:</span>
                  <span className="text-primary">Client payment cycle</span>
                </div>
                <div className="border-t border-green-600/30 pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="text-secondary">Total Interest:</span>
                    <span className="text-green-400 font-bold">₹{(supplyInterest/10000000).toFixed(2)} Cr</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-secondary">Total Payment:</span>
                    <span className="text-green-400 font-bold">₹{(totalSupplyPayment/10000000).toFixed(2)} Cr</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-green-800/20 rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">Supply Advantages:</h4>
                <ul className="text-sm text-secondary space-y-1">
                  <li>• Rapid approval (2-3 days)</li>
                  <li>• Backed by verified work orders</li>
                  <li>• Payment aligned with project cash flow</li>
                  <li>• No impact on credit lines for other projects</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Savings Summary */}
          <div className="mt-8 bg-gradient-to-r from-accent-amber/20 to-accent-amber/10 rounded-lg p-6 border border-accent-amber/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-accent-amber mb-4">Your Savings with Finverno</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-accent-amber">₹{(savings/10000000).toFixed(2)} Cr</div>
                  <div className="text-secondary text-sm">Total Interest Saved</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent-amber">{savingsPercentage.toFixed(0)}%</div>
                  <div className="text-secondary text-sm">Cost Reduction</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent-amber">{Math.round((loanTenure - 3)/30)} Months</div>
                  <div className="text-secondary text-sm">Faster Debt Freedom</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why This Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Why Short-Term Higher Rates Work Better</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">Time Value of Money</h3>
              <p className="text-secondary">
                Paying 36% for 90 days costs far less than 18% for 36 months. The shorter duration drastically reduces total interest burden.
              </p>
            </div>

            <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">Cash Flow Alignment</h3>
              <p className="text-secondary">
                Payment is synchronized with your client's payment cycle, ensuring you have cash flow to settle without stress.
              </p>
            </div>

            <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">No Long-term Commitment</h3>
              <p className="text-secondary">
                Keep your credit lines free for other opportunities. No lengthy EMI commitments that constrain future projects.
              </p>
            </div>
          </div>
        </div>

        {/* Real Example */}
        <div className="bg-gradient-to-br from-neutral-dark to-neutral-medium rounded-xl p-8 mb-16 border border-neutral-medium">
          <h2 className="text-3xl font-bold text-primary text-center mb-8">Real Project Example</h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-neutral-light rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-primary mb-4">Metro Station Construction - ₹5 Crore Contract</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-secondary mb-2">Project Details:</h4>
                  <ul className="text-sm text-secondary space-y-1">
                    <li>• Client: Delhi Metro Rail Corporation</li>
                    <li>• Contract Value: ₹5 Crores</li>
                    <li>• Material Cost: ₹2 Crores (40%)</li>
                    <li>• Client Payment Terms: 75 days</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary mb-2">Financing Need:</h4>
                  <ul className="text-sm text-secondary space-y-1">
                    <li>• Steel, cement, aggregates upfront</li>
                    <li>• Equipment rental payments</li>
                    <li>• Fuel for machinery</li>
                    <li>• Immediate material delivery required</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-red-900/20 rounded-lg p-6 border border-red-600/30">
                <h4 className="font-bold text-red-400 mb-3">Traditional Bank Loan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Loan Amount:</span>
                    <span>₹2 Crores</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="text-red-400">18% for 36 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly EMI:</span>
                    <span>₹7.24 Lakhs</span>
                  </div>
                  <div className="border-t border-red-600/30 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Total Interest:</span>
                      <span className="text-red-400">₹60.7 Lakhs</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/20 rounded-lg p-6 border border-green-600/30">
                <h4 className="font-bold text-green-400 mb-3">Finverno Supply</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Supply Value:</span>
                    <span>₹2 Crores</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="text-green-400">36% for 90 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <span>When client pays (75 days)</span>
                  </div>
                  <div className="border-t border-green-600/30 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Total Interest:</span>
                      <span className="text-green-400">₹14.8 Lakhs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-6 bg-accent-amber/20 rounded-lg p-4 border border-accent-amber/30">
              <p className="text-2xl font-bold text-accent-amber">
                You Save: ₹45.9 Lakhs (75% less interest cost)
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-accent-orange/20 to-accent-orange/10 rounded-xl p-12 text-center border border-accent-orange/30">
          <h2 className="text-4xl font-bold text-primary mb-6">Ready to Transform Your Project Financing?</h2>
          <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto">
            Stop paying long-term interest for short-term needs. Get contract-backed material supply 
            that aligns with your cash flow and saves you significant money.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button variant="primary" size="lg" className="min-w-[200px] bg-accent-orange hover:bg-orange-600">
              Apply for Material Supply
            </Button>
            <Button variant="outline" size="lg" className="min-w-[200px] border-accent-orange text-accent-orange hover:bg-accent-orange/10">
              Schedule Consultation
            </Button>
          </div>
          <div className="text-sm text-secondary">
            <p>✓ No collateral required • ✓ 2-3 day approval • ✓ Direct material delivery</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}