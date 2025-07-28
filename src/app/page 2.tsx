import { Layout, Button } from '@/components';
import Link from 'next/link';

export default function Home() {
  return (
    <Layout>
      {/* Hero Section - Palantir-inspired */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-neutral-dark to-primary opacity-50"></div>
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
                  FOUNDATIONAL SOFTWARE OF TOMORROW
                </div>
                <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 leading-tight tracking-tight">
                  Intelligent Capital for India's 
                  <span className="block accent-orange">Project Economy</span>
                </h1>
                <p className="text-xl text-secondary mb-8 leading-relaxed max-w-lg">
                  Institutionalizing project delivery through proprietary vetting, transparent structures, 
                  and risk-mitigated financing solutions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/contractors">
                    <Button variant="primary" size="lg" className="min-w-[200px]">
                      For Contractors
                    </Button>
                  </Link>
                  <Link href="/investors">
                    <Button variant="outline" size="lg" className="min-w-[200px]">
                      For Investors
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative h-96 bg-gradient-to-br from-neutral-dark to-neutral-medium rounded-lg border border-neutral-medium">
                  <div className="absolute inset-0 bg-gradient-to-t from-accent-orange/20 to-transparent rounded-lg"></div>
                  <div className="absolute top-6 left-6 right-6">
                    <div className="text-accent-orange text-sm font-mono mb-2">LIVE METRICS</div>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-secondary">Active Projects</span>
                        <span className="text-primary font-bold">127</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Capital Deployed</span>
                        <span className="text-primary font-bold">₹2.4B</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Average IRR</span>
                        <span className="text-accent-orange font-bold">13.2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement - Clean, Direct */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
                THE CHALLENGE
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
                The Hidden Bottleneck in India's Growth
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-lg text-secondary leading-relaxed mb-6">
                  India's infrastructure boom faces a critical constraint: working capital shortfall 
                  for SME execution partners.
                </p>
                <p className="text-lg text-secondary leading-relaxed">
                  The credit gap creates project delays, disrupts timelines, and limits the growth 
                  of India's most dynamic execution partners.
                </p>
              </div>
              <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium">
                <div className="text-accent-orange text-sm font-mono mb-4">IMPACT METRICS</div>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">₹18T</div>
                    <div className="text-secondary text-sm">Credit Gap in SME Sector</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">60%</div>
                    <div className="text-secondary text-sm">Projects Delayed by Capital</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">3-6M</div>
                    <div className="text-secondary text-sm">Average Payment Cycle</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution - Bold, Technical */}
      <section className="bg-neutral-dark py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
                OUR APPROACH
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
                Institutionalizing Project Delivery
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-neutral-medium p-8 rounded-lg border border-neutral-medium">
                <div className="text-accent-orange text-sm font-mono mb-4">01</div>
                <h3 className="text-xl font-bold text-primary mb-4">Proprietary Vetting</h3>
                <p className="text-secondary leading-relaxed">
                  Multi-dimensional risk assessment combining financial health, execution track record, 
                  and project viability analysis.
                </p>
              </div>
              <div className="bg-neutral-medium p-8 rounded-lg border border-neutral-medium">
                <div className="text-accent-orange text-sm font-mono mb-4">02</div>
                <h3 className="text-xl font-bold text-primary mb-4">Transparent Structures</h3>
                <p className="text-secondary leading-relaxed">
                  Contract-backed security with milestone-linked disbursements and real-time 
                  project monitoring capabilities.
                </p>
              </div>
              <div className="bg-neutral-medium p-8 rounded-lg border border-neutral-medium">
                <div className="text-accent-orange text-sm font-mono mb-4">03</div>
                <h3 className="text-xl font-bold text-primary mb-4">Risk Mitigation</h3>
                <p className="text-secondary leading-relaxed">
                  Blue-chip client guarantees, comprehensive insurance coverage, and continuous 
                  performance monitoring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Clients - Palantir-style */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
              ENTERPRISE PARTNERSHIPS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-12 leading-tight">
              Powering Projects for Industry Leaders
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
              <div className="text-2xl font-bold text-primary">ABB</div>
              <div className="text-2xl font-bold text-primary">SIEMENS</div>
              <div className="text-2xl font-bold text-primary">TVS GROUP</div>
              <div className="text-2xl font-bold text-primary">BOSCH</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Clean, Powerful */}
      <section className="bg-neutral-dark py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
              GET STARTED
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
              Transform Your Capital Strategy
            </h2>
            <p className="text-lg text-secondary mb-12 max-w-2xl mx-auto">
              Join the institutional revolution in project financing. 
              Access capital or deploy it with unprecedented transparency and control.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/contractors">
                <Button variant="primary" size="lg" className="min-w-[200px]">
                  Access Capital
                </Button>
              </Link>
              <Link href="/investors">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Deploy Capital
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}