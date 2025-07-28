import { Layout, Button } from '@/components';
import Link from 'next/link';

export default function InvestorsPage() {
  return (
    <Layout>
      {/* Header Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-8 leading-tight">
            Unlock High-Yield, <span className="accent-orange">Impactful Investment</span> Opportunities
          </h1>
          <p className="text-xl md:text-2xl text-secondary mb-8 leading-relaxed">
            Access a new institutional asset class that powers India's project economy while generating superior returns.
          </p>
        </div>
      </section>

      {/* Investment Thesis Section */}
      <section className="bg-neutral-dark py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8">
              The Project Delivery Asset Class Revolution
            </h2>
            <div className="text-lg md:text-xl text-secondary leading-relaxed space-y-6">
              <p>
                Invero introduces investors to the <strong className="text-primary">Project Delivery Asset Class</strong> – 
                a previously inaccessible investment category that directly powers India's infrastructure growth.
              </p>
              <p>
                By financing working capital for vetted SME contractors executing projects for blue-chip clients, 
                we create a win-win ecosystem where your capital drives economic development while generating 
                attractive, risk-adjusted returns.
              </p>
              <p>
                Our proprietary risk management framework de-risks investor capital through comprehensive 
                contractor vetting, contract-backed security, and milestone-linked disbursements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Investment Features */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-12 text-center">
            Key Investment Features
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Tailored Opportunities */}
            <div className="bg-neutral-dark p-6 rounded-lg text-center">
              <div className="text-3xl accent-orange mb-4">🎯</div>
              <h3 className="text-xl font-bold text-primary mb-3">
                Tailored Opportunities
              </h3>
              <p className="text-secondary">
                Transparent, carefully curated investment opportunities aligned with your risk appetite and return expectations.
              </p>
            </div>

            {/* Proprietary Vetting */}
            <div className="bg-neutral-dark p-6 rounded-lg text-center">
              <div className="text-3xl accent-orange mb-4">🔍</div>
              <h3 className="text-xl font-bold text-primary mb-3">
                Proprietary Vetting
              </h3>
              <p className="text-secondary">
                Our rigorous due diligence process evaluates contractor track records, project viability, and client creditworthiness.
              </p>
            </div>

            {/* Tech-Enabled Monitoring */}
            <div className="bg-neutral-dark p-6 rounded-lg text-center">
              <div className="text-3xl accent-orange mb-4">📊</div>
              <h3 className="text-xl font-bold text-primary mb-3">
                Tech-Enabled Monitoring
              </h3>
              <p className="text-secondary">
                Continuous project monitoring and real-time updates ensure transparency and proactive risk management.
              </p>
            </div>

            {/* High-Yield Returns */}
            <div className="bg-neutral-dark p-6 rounded-lg text-center">
              <div className="text-3xl accent-orange mb-4">📈</div>
              <h3 className="text-xl font-bold text-primary mb-3">
                High-Yield Returns
              </h3>
              <p className="text-secondary">
                Target IRRs of 12-14% with structured security mechanisms and milestone-linked payouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot Investment Opportunity */}
      <section className="bg-neutral-dark py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-12 text-center">
              Pilot Investment Opportunity
            </h2>
            
            <div className="bg-neutral-medium p-8 rounded-lg mb-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-secondary mb-2">MINIMUM TICKET SIZE</h3>
                  <p className="text-2xl font-bold accent-orange">₹50,000</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-medium text-secondary mb-2">TARGET IRR</h3>
                  <p className="text-2xl font-bold accent-orange">12–14%</p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-medium text-secondary mb-2">TENURE</h3>
                  <p className="text-2xl font-bold accent-orange">3–9 Months</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-neutral-medium p-6 rounded-lg">
                <h3 className="text-xl font-bold text-primary mb-4">Structure</h3>
                <ul className="text-secondary space-y-2">
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    SPV/Revenue-Share Model
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Contract/PO-backed execution
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Milestone-linked payouts
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Transparent fee structure
                  </li>
                </ul>
              </div>

              <div className="bg-neutral-medium p-6 rounded-lg">
                <h3 className="text-xl font-bold text-primary mb-4">Security Features</h3>
                <ul className="text-secondary space-y-2">
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Contract-backed security
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Blue-chip client guarantees
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Milestone-based disbursements
                  </li>
                  <li className="flex items-start">
                    <span className="accent-orange mr-2">•</span>
                    Real-time project monitoring
                  </li>
                </ul>
              </div>
            </div>

            {/* Live Project Pipeline */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold text-primary mb-6 text-center">
                Live Project Pipeline
              </h3>
              <div className="bg-neutral-medium p-6 rounded-lg">
                <p className="text-secondary mb-4 text-center">
                  Current projects backed by industry-leading clients:
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  <div className="bg-primary px-6 py-3 rounded-lg">
                    <span className="text-xl font-bold accent-orange">ABB</span>
                  </div>
                  <div className="bg-primary px-6 py-3 rounded-lg">
                    <span className="text-xl font-bold accent-orange">Siemens</span>
                  </div>
                  <div className="bg-primary px-6 py-3 rounded-lg">
                    <span className="text-xl font-bold accent-orange">TVS Group</span>
                  </div>
                  <div className="bg-primary px-6 py-3 rounded-lg">
                    <span className="text-xl font-bold accent-orange">Bosch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invest Now CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8">
              Ready to Invest in India's Growth Story?
            </h2>
            <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
              Join our pilot investment program and be among the first to access this revolutionary asset class. 
              Limited spots available for qualified investors.
            </p>
            <Link href="/investors/inquire">
              <Button variant="primary" size="lg">
                Invest Now
              </Button>
            </Link>
            <p className="text-sm text-secondary mt-4">
              Investment subject to qualification and regulatory requirements
            </p>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section className="bg-neutral-dark py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-8">
              Already an Investor?
            </h2>
            <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
              Access your personalized investment dashboard to track your portfolio performance, 
              view project updates, and manage your investments.
            </p>
            <Link href="/dashboard/investor">
              <Button variant="secondary" size="lg">
                Access Your Investment Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}