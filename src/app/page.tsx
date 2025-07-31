import { Layout, Button } from '@/components';
import Link from 'next/link';

export default function Home(): React.ReactElement {
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
                  <span className="block accent-amber">Project Economy</span>
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
                  <div className="absolute inset-0 bg-gradient-to-t from-accent-amber/20 to-transparent rounded-lg"></div>
                  <div className="absolute top-6 left-6 right-6">
                    <div className="text-accent-amber text-sm font-mono mb-2">LIVE METRICS</div>
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
                        <span className="text-accent-amber font-bold">13.2%</span>
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
                <div className="text-accent-amber text-sm font-mono mb-4">IMPACT METRICS</div>
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
                <div className="text-accent-amber text-sm font-mono mb-4">01</div>
                <h3 className="text-xl font-bold text-primary mb-4">Proprietary Vetting</h3>
                <p className="text-secondary leading-relaxed">
                  Multi-dimensional risk assessment combining financial health, execution track record, 
                  and project viability analysis.
                </p>
              </div>
              <div className="bg-neutral-medium p-8 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-4">02</div>
                <h3 className="text-xl font-bold text-primary mb-4">Transparent Structures</h3>
                <p className="text-secondary leading-relaxed">
                  Contract-backed security with milestone-linked disbursements and real-time 
                  project monitoring capabilities.
                </p>
              </div>
              <div className="bg-neutral-medium p-8 rounded-lg border border-neutral-medium">
                <div className="text-accent-amber text-sm font-mono mb-4">03</div>
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


      {/* Market Insights Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-accent-amber text-sm font-semibold uppercase tracking-wide mb-4">
                MARKET INSIGHTS
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
                Data-Driven Market Intelligence
              </h2>
              <p className="text-lg text-secondary max-w-3xl mx-auto">
                Understanding the fundamentals driving India's project economy and alternative investment landscape.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* MSME Credit Gap */}
              <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium hover-lift">
                <div className="text-accent-amber text-sm font-mono mb-4">CREDIT GAP ANALYSIS</div>
                <h3 className="text-xl font-bold text-primary mb-4">
                  India's ₹25 Lakh Crore MSME Funding Shortfall
                </h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">Total MSMEs</span>
                    <span className="text-primary font-bold">64 Million</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">Credit Access</span>
                    <span className="text-warning font-bold">Only 14%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">Funding Gap</span>
                    <span className="text-accent-amber font-bold">$530 Billion</span>
                  </div>
                </div>
                <p className="text-secondary text-sm leading-relaxed mb-4">
                  Parliamentary Standing Committee on Finance identifies massive credit gap affecting project execution across India's MSME sector.
                </p>
                <div className="text-xs text-secondary">
                  Source: SIDBI Report 2024, Parliamentary Committee on Finance
                </div>
              </div>

              {/* HNI Investment Trends */}
              <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium hover-lift">
                <div className="text-accent-amber text-sm font-mono mb-4">INVESTMENT TRENDS</div>
                <h3 className="text-xl font-bold text-primary mb-4">
                  HNI Alternative Investment Surge
                </h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">HNI Population</span>
                    <span className="text-primary font-bold">3.1 Lakh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">AIF Commitments</span>
                    <span className="text-success font-bold">₹11 Trillion</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">Alternative Yield</span>
                    <span className="text-accent-amber font-bold">6-11%</span>
                  </div>
                </div>
                <p className="text-secondary text-sm leading-relaxed mb-4">
                  India's HNI population growing 158% with Alternative Investment Funds reaching historic ₹11 trillion milestone.
                </p>
                <div className="text-xs text-secondary">
                  Source: SEBI AIF Data 2024, PMS Bazaar Analysis
                </div>
              </div>

              {/* Economic Impact */}
              <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium hover-lift">
                <div className="text-accent-amber text-sm font-mono mb-4">ECONOMIC IMPACT</div>
                <h3 className="text-xl font-bold text-primary mb-4">
                  Project Delivery Asset Class Emergence
                </h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">MSME GDP Share</span>
                    <span className="text-primary font-bold">30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">Employment</span>
                    <span className="text-primary font-bold">110 Million</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">Export Share</span>
                    <span className="text-accent-amber font-bold">45%</span>
                  </div>
                </div>
                <p className="text-secondary text-sm leading-relaxed mb-4">
                  MSMEs contribute significantly to India's economy, yet face structural financing challenges that institutional capital can address.
                </p>
                <div className="text-xs text-secondary">
                  Source: MSME Ministry Annual Report 2023-24, NITI Aayog
                </div>
              </div>
            </div>

            {/* Market Research Links */}
            <div className="mt-16 bg-neutral-darker p-8 rounded-lg border border-neutral-medium">
              <h3 className="text-xl font-bold text-primary mb-6 text-center">
                In-Depth Market Research
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-accent-amber text-2xl mb-2">📊</div>
                  <h4 className="text-sm font-semibold text-primary mb-2">SIDBI MSME Pulse</h4>
                  <p className="text-xs text-secondary">Comprehensive sector analysis and credit penetration data</p>
                </div>
                <div className="text-center">
                  <div className="text-accent-amber text-2xl mb-2">🏛️</div>
                  <h4 className="text-sm font-semibold text-primary mb-2">RBI Financial Inclusion</h4>
                  <p className="text-xs text-secondary">Central bank insights on MSME financing challenges</p>
                </div>
                <div className="text-center">
                  <div className="text-accent-amber text-2xl mb-2">📈</div>
                  <h4 className="text-sm font-semibold text-primary mb-2">SEBI AIF Reports</h4>
                  <p className="text-xs text-secondary">Alternative investment fund growth and HNI participation trends</p>
                </div>
                <div className="text-center">
                  <div className="text-accent-amber text-2xl mb-2">🌐</div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Parliamentary Committee</h4>
                  <p className="text-xs text-secondary">Government analysis of MSME credit gap and policy recommendations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Clean, Powerful */}
      <section className="bg-neutral-dark py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-accent-amber text-sm font-semibold uppercase tracking-wide mb-4">
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