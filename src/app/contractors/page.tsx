import { Layout, Button } from '@/components';
import Link from 'next/link';

export default function ContractorsPage(): React.ReactElement {
  return (
    <Layout>
      {/* Header Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-8 leading-tight">
            Empowering <span className="accent-orange">SME Execution Partners</span>
          </h1>
          <p className="text-xl md:text-2xl text-secondary mb-8 leading-relaxed">
            Access the capital you need to grow your business and execute projects without traditional barriers.
          </p>
        </div>
      </section>

      {/* Benefit Breakdown Section */}
      <section className="bg-neutral-dark py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-12 text-center">
            How Invero Transforms Your Business
          </h2>
          
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Fast Access Capital */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <h3 className="text-2xl font-bold text-primary mb-4">
                  Fast-Access Capital Without Traditional Collateral
                </h3>
                <p className="text-lg text-secondary leading-relaxed mb-4">
                  Break free from the constraints of traditional lending. Our proprietary vetting process 
                  evaluates your project execution capabilities and track record, not just your assets.
                </p>
                <ul className="text-secondary space-y-2">
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    No property collateral required
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Quick approval process based on project merit
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Competitive rates aligned with project timelines
                  </li>
                </ul>
              </div>
              <div className="order-1 md:order-2 bg-neutral-medium p-8 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl accent-orange mb-4">⚡</div>
                  <h4 className="text-xl font-bold text-primary">Lightning Fast</h4>
                  <p className="text-secondary">Get approved in days, not months</p>
                </div>
              </div>
            </div>

            {/* Working Capital Solutions */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="bg-neutral-medium p-8 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl accent-orange mb-4">💰</div>
                  <h4 className="text-xl font-bold text-primary">Capital Flow</h4>
                  <p className="text-secondary">Bridge the gap between project start and payment</p>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary mb-4">
                  Address Crippling Working Capital Shortfalls
                </h3>
                <p className="text-lg text-secondary leading-relaxed mb-4">
                  Don't let cash flow gaps limit your growth. Our flexible financing solutions ensure 
                  you have the working capital needed to take on larger projects and scale your operations.
                </p>
                <ul className="text-secondary space-y-2">
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Bridge financing for project initiation
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Flexible repayment aligned with project milestones
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Scale financing as your business grows
                  </li>
                </ul>
              </div>
            </div>

            {/* Project Delivery */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <h3 className="text-2xl font-bold text-primary mb-4">
                  Overcome Project Delays and Disruptions
                </h3>
                <p className="text-lg text-secondary leading-relaxed mb-4">
                  Eliminate the stress of project delays caused by funding gaps. With reliable capital 
                  access, you can maintain project momentum and meet critical deadlines.
                </p>
                <ul className="text-secondary space-y-2">
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Maintain consistent project execution
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Meet client deadlines with confidence
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Build stronger client relationships through reliability
                  </li>
                </ul>
              </div>
              <div className="order-1 md:order-2 bg-neutral-medium p-8 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl accent-orange mb-4">🎯</div>
                  <h4 className="text-xl font-bold text-primary">On-Time Delivery</h4>
                  <p className="text-secondary">Never miss a deadline due to funding issues</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apply for Funding CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8">
              Ready to Access the Capital You Need?
            </h2>
            <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
              Take the first step towards transforming your business. Our streamlined application 
              process gets you the funding you need to grow and execute with confidence.
            </p>
            <Link href="/contractors/apply">
              <Button variant="primary" size="lg">
                Apply for Funding
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section className="bg-neutral-dark py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8">
              Already a Partner?
            </h2>
            <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
              Access your personalized dashboard to manage your applications, track funding status, 
              and view your project portfolio.
            </p>
            <Link href="/dashboard/contractor">
              <Button variant="secondary" size="lg">
                Access Your Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}