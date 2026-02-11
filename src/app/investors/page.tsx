import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function InvestorsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-primary mb-6">
            Infrastructure as an <span className="text-accent-orange">Asset Class</span>
          </h1>
          <p className="text-xl text-secondary max-w-4xl mx-auto mb-8 leading-relaxed">
            Access pre-vetted, MNC-backed infrastructure projects with enhanced execution capability through 
            our supply enablement platform designed for sophisticated capital allocation.
          </p>
          <div className="bg-neutral-light rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-lg text-primary font-medium">
              Target Returns: <span className="text-accent-orange font-bold">16-20% IRR</span> | 
              Investment Horizon: <span className="text-accent-orange font-bold">6-18 months</span> | 
              SEBI Regulated AIF Structure
            </p>
          </div>
        </div>

        {/* Investment Thesis */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Investment Thesis</h2>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-2xl font-semibold text-primary mb-6">The Opportunity</h3>
              <div className="space-y-6">
                <div className="border-l-4 border-accent-orange pl-6">
                  <h4 className="font-semibold text-primary mb-2">Enhanced Infrastructure Execution</h4>
                  <p className="text-secondary">
                    India's ₹25 lakh crore MSME working capital gap creates project execution delays. 
                    Our supply enablement platform ensures reliable delivery for creditworthy contractors with confirmed MNC orders.
                  </p>
                </div>
                <div className="border-l-4 border-accent-orange pl-6">
                  <h4 className="font-semibold text-primary mb-2">Infrastructure Growth Catalyst</h4>
                  <p className="text-secondary">
                    India's infrastructure sector is projected to grow at 8% CAGR, reaching $280.6B by 2030. 
                    We're enabling reliable execution for the contractors delivering this massive expansion.
                  </p>
                </div>
                <div className="border-l-4 border-accent-orange pl-6">
                  <h4 className="font-semibold text-primary mb-2">De-risked Revenue Streams</h4>
                  <p className="text-secondary">
                    Unlike traditional SME lending, our investments are secured by payment obligations 
                    from blue-chip MNCs, not contractor balance sheets.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-neutral-light to-neutral-medium rounded-lg p-8">
              <h3 className="text-2xl font-semibold text-primary mb-6 text-center">Risk-Return Profile</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center py-3 border-b border-neutral-medium">
                  <span className="text-secondary">Target IRR</span>
                  <span className="text-primary font-bold">16-20%</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-medium">
                  <span className="text-secondary">Investment Duration</span>
                  <span className="text-primary font-bold">6-18 months</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-medium">
                  <span className="text-secondary">Minimum Investment</span>
                  <span className="text-primary font-bold">₹1 Crore</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-medium">
                  <span className="text-secondary">Fund Structure</span>
                  <span className="text-primary font-bold">SEBI Regulated AIF</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-secondary">Capital Protection</span>
                  <span className="text-primary font-bold">MNC Payment Security</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Process */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Investment Architecture</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">Due Diligence</h3>
              <p className="text-secondary text-sm">
                Proprietary vetting algorithm combined with human expertise evaluates contractor capability and MNC payment reliability.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">Capital Deployment</h3>
              <p className="text-secondary text-sm">
                AIF capital flows through SPVs into revenue-linked NCDs, providing contractors working capital against confirmed orders.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">Real-time Monitoring</h3>
              <p className="text-secondary text-sm">
                Continuous project oversight with automated milestone tracking and revenue collection via bank mandates.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">Return Generation</h3>
              <p className="text-secondary text-sm">
                Automated revenue share collection as MNCs pay contractors, generating predictable returns throughout project lifecycle.
              </p>
            </div>
          </div>
        </div>

        {/* Competitive Advantages */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Competitive Differentiation</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold text-primary mb-6">Traditional Alternatives</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-secondary">Private Equity/VC</p>
                    <p className="text-sm text-secondary">5-7 year lock-ins, illiquid, concentrated risk</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-secondary">Real Estate</p>
                    <p className="text-sm text-secondary">High entry barriers, regulatory complexity, cyclical</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-secondary">Fixed Deposits/Bonds</p>
                    <p className="text-sm text-secondary">Low returns, inflation erosion, limited upside</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-secondary">Stock Markets</p>
                    <p className="text-sm text-secondary">Volatile, correlation risk, requires active management</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-primary mb-6">Finverno Advantage</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">Short Duration, High Yield</p>
                    <p className="text-sm text-secondary">6-18 month cycles with 16-20% IRR potential</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">Contract-secured Returns</p>
                    <p className="text-sm text-secondary">Backed by verified MNC work orders and enhanced execution reliability</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">Portfolio Diversification</p>
                    <p className="text-sm text-secondary">Uncorrelated to traditional asset classes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">Technology-enabled Transparency</p>
                    <p className="text-sm text-secondary">Real-time visibility into project execution and cash flows</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Risk Framework</h2>
          
          <div className="bg-neutral-light rounded-lg p-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-medium rounded-lg flex items-center justify-center mx-auto mb-4 border border-accent-orange/20">
                  <svg className="w-8 h-8 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-primary mb-3">Credit Risk Mitigation</h3>
                <p className="text-secondary text-sm">
                  Focus on MNC counterparties with strong credit ratings. Payment obligations secured at contract level, not dependent on contractor solvency.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-medium rounded-lg flex items-center justify-center mx-auto mb-4 border border-accent-orange/20">
                  <svg className="w-8 h-8 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-primary mb-3">Portfolio Diversification</h3>
                <p className="text-secondary text-sm">
                  Spread investments across multiple contractors, industries, and project types. No single exposure exceeds risk concentration limits.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-medium rounded-lg flex items-center justify-center mx-auto mb-4 border border-accent-orange/20">
                  <svg className="w-8 h-8 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-primary mb-3">Operational Oversight</h3>
                <p className="text-secondary text-sm">
                  Continuous project monitoring through third-party PMCs. Early warning systems for milestone delays or quality issues.
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Fund Terms */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Fund Structure & Terms</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-neutral-light to-neutral-medium rounded-lg p-8">
              <h3 className="text-xl font-semibold text-primary mb-6">Investment Parameters</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-neutral-medium">
                  <span className="text-secondary">Fund Type</span>
                  <span className="text-primary font-medium">Category II AIF</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-medium">
                  <span className="text-secondary">Minimum Commitment</span>
                  <span className="text-primary font-medium">₹1 Crore</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-medium">
                  <span className="text-secondary">Fund Size</span>
                  <span className="text-primary font-medium">₹100 Crore (Target)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-medium">
                  <span className="text-secondary">Management Fee</span>
                  <span className="text-primary font-medium">2% p.a.</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-secondary">Performance Fee</span>
                  <span className="text-primary font-medium">20% above 12% hurdle</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-neutral-light to-neutral-medium rounded-lg p-8">
              <h3 className="text-xl font-semibold text-primary mb-6">Regulatory Framework</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">SEBI Registration</p>
                    <p className="text-sm text-secondary">Fully compliant Category II AIF structure</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">Custodian Services</p>
                    <p className="text-sm text-secondary">SEBI-registered custodian for asset protection</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">Independent Oversight</p>
                    <p className="text-sm text-secondary">Third-party fund administrator and auditor</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-primary">Transparent Reporting</p>
                    <p className="text-sm text-secondary">Monthly NAV updates, quarterly detailed reports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary to-neutral-dark rounded-lg p-12 text-center text-white mb-20">
          <h2 className="text-3xl font-bold mb-6">Ready to Explore Infrastructure Finance?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
            Join sophisticated investors in accessing India's infrastructure opportunity through our regulated, transparent platform.
          </p>
          <div className="flex justify-center">
            <Link href="/contact">
              <Button variant="primary" className="bg-accent-orange hover:bg-orange-600 px-8 py-3">
                Schedule Private Discussion
              </Button>
            </Link>
          </div>
          <p className="text-sm mt-6 opacity-75">
            For accredited investors only. Past performance does not guarantee future results.
          </p>
        </div>

        {/* Dashboard Access */}
        <div className="bg-neutral-light rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">Existing Investor?</h2>
          <p className="text-secondary mb-6 max-w-2xl mx-auto">
            Access your personalized investment dashboard to monitor portfolio performance, review fund statements, and track project updates.
          </p>
          <Button variant="secondary" className="px-8 py-3">
            <a href="/dashboard/investor" className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Access Investor Dashboard</span>
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
