import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function AboutUs() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-primary mb-6">
            Supply Chains That <span className="text-accent-orange">Enable</span>
          </h1>
          <p className="text-xl text-secondary max-w-3xl mx-auto mb-8">
            Bridging the supply gap for those building the infrastructure of tomorrow's India. 
            We empower SME contractors with contract-backed project supplies while delivering superior returns to institutional partners.
          </p>
          <div className="flex justify-center">
            <Link href="/investors">
              <Button variant="primary" className="px-8 py-3">
                Explore Opportunities
              </Button>
            </Link>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="bg-neutral-light rounded-lg p-8">
            <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-primary mb-4">Our Mission</h2>
            <p className="text-secondary">
              To empower Indian SMEs to deliver world-class infrastructure and industrial services — not by changing who they are, 
              but by giving them the supply chain capability to execute without compromise.
            </p>
          </div>
          
          <div className="bg-neutral-light rounded-lg p-8">
            <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-primary mb-4">Our Vision</h2>
            <p className="text-secondary">
              Building India, Globally Recognized. To fortify India's infrastructure and elevate the perception of Indian businesses 
              on the global stage through efficient capital deployment and world-class execution.
            </p>
          </div>
        </div>

        {/* The Problem & Solution */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">The Challenge We're Solving</h2>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold text-primary mb-6">The Problem</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-secondary">
                    India's SME contractors face working capital gaps of 60-120 days despite having confirmed orders from creditworthy MNCs
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-secondary">
                    Traditional bank lending is rigid, slow, and collateral-heavy, not suited for short-cycle project finance
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-secondary">
                    India's MSME credit gap is estimated at ₹25 Lakh Crore, with only 14-40% having access to formal credit
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-primary mb-6">Our Solution</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-secondary">
                    Tech-enabled platform connecting HNIs with vetted SME contractors through structured investment vehicles (AIFs)
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-secondary">
                    Revenue-linked financing secured by MNC payment obligations, offering 16%+ IRR to investors
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-secondary">
                    Real-time project monitoring and automated collection systems minimize risk and maximize transparency
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">How Finverno Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-4">Verify & Enable</h3>
              <p className="text-secondary">
                We rigorously verify SME contractors with confirmed MNC work orders and enable their supply chain through our institutional partnership structure.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-4">Supply & Monitor</h3>
              <p className="text-secondary">
                Project supplies are delivered through contract-backed arrangements with real-time execution monitoring and automated milestone tracking for complete transparency.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-4">Execute & Return</h3>
              <p className="text-secondary">
                As projects complete and MNCs pay, supply settlements flow through our platform automatically, generating superior risk-adjusted returns for partners.
              </p>
            </div>
          </div>
        </div>

        {/* Market Opportunity */}
        <div className="bg-gradient-to-r from-neutral-light to-neutral-medium rounded-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-primary text-center mb-8">Market Opportunity</h2>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-accent-orange mb-2">₹25L Cr</div>
              <p className="text-secondary">Total MSME Credit Gap</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent-orange mb-2">₹280.6B</div>
              <p className="text-secondary">Infrastructure Market by 2030</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent-orange mb-2">8.0%</div>
              <p className="text-secondary">Expected CAGR Growth</p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Leadership Team</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-neutral-light rounded-lg p-6 text-center">
              <div className="w-20 h-20 bg-accent-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">UM</span>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">Uma Maheshwar</h3>
              <p className="text-accent-orange mb-3">Co-Founder</p>
              <p className="text-sm text-secondary">
                Deep expertise in financial structuring, infrastructure landscape, and construction management. 
                Leading the vision to transform India's SME financing ecosystem.
              </p>
            </div>

            <div className="bg-neutral-light rounded-lg p-6 text-center">
              <div className="w-20 h-20 bg-accent-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">KH</span>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">Kshitij Hastu</h3>
              <p className="text-accent-orange mb-3">Co-Founder</p>
              <p className="text-sm text-secondary">
                Expert in sales, product management, and scaling operations. Focused on building strong partnerships 
                with SMEs, HNIs, and NBFCs.
              </p>
            </div>

            <div className="bg-neutral-light rounded-lg p-6 text-center">
              <div className="w-20 h-20 bg-accent-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">PA</span>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">Pranav Alva</h3>
              <p className="text-accent-orange mb-3">Co-Founder & CTO</p>
              <p className="text-sm text-secondary">
                Full-stack platform architect with expertise in AI/ML, data engineering, and financial technology. 
                Building the tech infrastructure that powers our platform.
              </p>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Our Values</h2>
          
          <div className="grid md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-primary mb-2">Transparency</h3>
              <p className="text-sm text-secondary">Escrow-based, trackable flows and reporting for all stakeholders</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-primary mb-2">Alignment</h3>
              <p className="text-sm text-secondary">Investors, vendors, and Finverno win or lose together</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-primary mb-2">Integrity</h3>
              <p className="text-sm text-secondary">No backdoors, no shortcuts — rigorous vetting and execution</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-primary mb-2">Dignity</h3>
              <p className="text-sm text-secondary">We respect our vendors as capable entrepreneurs</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-primary mb-2">Purpose</h3>
              <p className="text-sm text-secondary">Everything we do serves India's progress and global reputation</p>
            </div>
          </div>
        </div>


        {/* CTA Section */}
        <div className="text-center bg-neutral-light rounded-lg p-12">
          <h2 className="text-3xl font-bold text-primary mb-4">Ready to Build India's Future?</h2>
          <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
            Join us in transforming India's infrastructure financing ecosystem. Whether you're an investor seeking superior returns 
            or a contractor needing flexible capital, Finverno is your partner in growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/investors">
              <Button variant="primary" className="px-8 py-3">
                Become an Investor
              </Button>
            </Link>
            <Link href="/contractors/apply">
              <Button variant="secondary" className="px-8 py-3">
                Apply as Contractor
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}