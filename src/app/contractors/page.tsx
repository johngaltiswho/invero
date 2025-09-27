import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function ContractorsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-primary mb-6">
            <span className="text-accent-orange">Project Supply Enablement</span> for Confirmed Orders
          </h1>
          <p className="text-xl text-secondary max-w-3xl mx-auto mb-8 leading-relaxed">
            Access materials, equipment, fuel, and project essentials for your infrastructure projects backed by verified corporate work orders.
          </p>
          <div className="bg-neutral-light rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-lg text-primary font-medium">
              Contract-backed supply | Direct-to-site delivery | Competitive terms
            </p>
          </div>
        </div>

        {/* The Problem */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Common Project Supply Challenges</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-neutral-light rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-neutral-medium rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">Procurement Timing Gaps</h3>
              <p className="text-secondary text-sm">
                Project supplies are needed immediately while client payments typically follow 60-120 day cycles.
              </p>
            </div>

            <div className="bg-neutral-light rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-neutral-medium rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L12 12m6.364 6.364L12 12m0 0L5.636 5.636M12 12l6.364-6.364M12 12l-6.364 6.364" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">Traditional Procurement Limitations</h3>
              <p className="text-secondary text-sm">
                Conventional suppliers require upfront payments and lengthy approval processes unsuited for urgent project needs.
              </p>
            </div>

            <div className="bg-neutral-light rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-neutral-medium rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">Growth Constraints</h3>
              <p className="text-secondary text-sm">
                Limited working capital restricts the ability to pursue larger contracts and scale operations effectively.
              </p>
            </div>
          </div>
        </div>

        {/* The Solution */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Our Solution</h2>
          
          <div className="space-y-16">
            {/* Simple Process */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-6">Streamlined Application Process</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-accent-orange rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-primary">Submit confirmed work orders</p>
                      <p className="text-sm text-secondary">From established corporate clients with verified payment obligations</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-accent-orange rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-primary">Evaluation and verification</p>
                      <p className="text-sm text-secondary">Assessment of execution capability, project history, and client relationships</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-accent-orange rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-primary">Capital deployment</p>
                      <p className="text-sm text-secondary">Funds disbursed upon approval, typically within 7-10 business days</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-neutral-light to-neutral-medium rounded-lg p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-primary mb-4">Order-Based Security</h4>
                  <p className="text-secondary mb-4">Working capital secured by confirmed purchase orders rather than traditional collateral requirements.</p>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-accent-orange font-medium">Typical approval timeline: 5-7 business days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What You Get */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="bg-gradient-to-br from-neutral-light to-neutral-medium rounded-lg p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-accent-orange rounded-lg flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-primary mb-4">Project Financing</h4>
                  <p className="text-secondary mb-4">Access capital for materials, labor, and operational expenses aligned with project milestones and payment schedules.</p>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-accent-orange font-medium">Financing range: 30-50% of confirmed order value</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-semibold text-primary mb-6">Key Benefits</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-primary">Immediate capital access</p>
                      <p className="text-sm text-secondary">Bridge the gap between project initiation and client payment cycles</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-primary">Revenue-aligned repayment</p>
                      <p className="text-sm text-secondary">Structured repayment terms synchronized with project cash flows</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-primary">Scale operational capacity</p>
                      <p className="text-sm text-secondary">Pursue larger contracts and expand project portfolio with enhanced working capital</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent-orange rounded-full mt-3 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium text-primary">Strengthen client relationships</p>
                      <p className="text-sm text-secondary">Ensure consistent project delivery and build long-term partnership value</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Application Requirements</h2>
          
          <div className="bg-neutral-light rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-primary mb-4">Essential Requirements:</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-accent-orange rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-secondary">Verified purchase orders from established corporate clients</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-accent-orange rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-secondary">Minimum 2 years of operational history</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-accent-orange rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-secondary">Demonstrated project completion track record</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-accent-orange rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-secondary">Standard business documentation (GST, PAN, incorporation)</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-primary mb-4">Supporting Documentation:</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-neutral-medium rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-secondary">Client references and testimonials</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-neutral-medium rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-secondary">Project portfolio and completion certificates</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-neutral-medium rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-secondary">Financial statements (previous 6 months)</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-neutral-medium rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-secondary">Professional certifications and licenses</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* CTA Section */}
        <div className="bg-gradient-to-br from-neutral-light to-neutral-medium rounded-lg p-12 text-center border border-neutral-medium mb-20">
          <h2 className="text-3xl font-bold text-primary mb-6">Partner with Finverno</h2>
          <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto">
            Access project supply solutions designed for infrastructure and industrial contractors with verified corporate work orders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contractors/apply">
              <Button variant="primary" className="bg-accent-orange hover:bg-orange-600 text-white px-8 py-3">
                Submit Application
              </Button>
            </Link>
            <Link href="/contractors/compare">
              <Button variant="secondary" className="bg-transparent border-2 border-accent-orange hover:bg-accent-orange/10 text-accent-orange px-8 py-3">
                Compare Financing Options
              </Button>
            </Link>
            <Button variant="secondary" className="bg-transparent border-2 border-neutral-medium hover:bg-neutral-light text-primary px-8 py-3">
              Schedule Consultation
            </Button>
          </div>
          <p className="text-sm text-secondary mt-6">
            Transparent terms. Streamlined process. Professional partnership.
          </p>
        </div>

        {/* Dashboard Access */}
        <div className="bg-accent-orange/5 border border-accent-orange/20 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">Existing Partner?</h2>
          <p className="text-secondary mb-6 max-w-2xl mx-auto">
            Access your contractor dashboard to track application status, manage active projects, and monitor funding disbursements.
          </p>
          <Button variant="primary" className="bg-accent-orange hover:bg-orange-600 text-white px-8 py-3">
            <a href="/dashboard/contractor" className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Access Contractor Dashboard</span>
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
}