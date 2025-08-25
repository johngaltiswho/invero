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
                  Institutionalizing project delivery through ESG-integrated vetting, transparent structures, 
                  and risk-mitigated financing solutions for sustainable growth.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/dashboard/contractor">
                    <Button variant="primary" size="lg" className="min-w-[200px]">
                      Contractor Portal
                    </Button>
                  </Link>
                  <Link href="/dashboard/investor">
                    <Button variant="outline" size="lg" className="min-w-[200px]">
                      Investor Portal
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

      {/* ESG Framework Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-accent-orange text-sm font-semibold uppercase tracking-wide mb-4">
                SUSTAINABLE PROJECT EXECUTION
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
                ESG-Integrated Infrastructure Financing
              </h2>
              <p className="text-lg text-secondary max-w-3xl mx-auto">
                Promoting environmentally, socially, and ethically responsible practices across all SME contractor projects while delivering superior returns.
              </p>
            </div>

            {/* ESG Pillars */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 p-8 rounded-lg border border-green-800/30">
                <div className="text-green-400 text-sm font-mono mb-4">ENVIRONMENTAL</div>
                <h3 className="text-xl font-bold text-primary mb-4">Resource Efficiency & Waste Management</h3>
                <ul className="text-secondary text-sm space-y-2">
                  <li>• Energy & water consumption tracking</li>
                  <li>• 90%+ construction waste diversion from landfills</li>
                  <li>• Local material sourcing (100km radius)</li>
                  <li>• Dust & noise pollution control compliance</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-8 rounded-lg border border-blue-800/30">
                <div className="text-blue-400 text-sm font-mono mb-4">SOCIAL</div>
                <h3 className="text-xl font-bold text-primary mb-4">Worker Safety & Community Engagement</h3>
                <ul className="text-secondary text-sm space-y-2">
                  <li>• Zero tolerance for safety incidents</li>
                  <li>• Fair wage compliance & timely payments</li>
                  <li>• Local employment prioritization</li>
                  <li>• Community grievance mechanisms</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-8 rounded-lg border border-purple-800/30">
                <div className="text-purple-400 text-sm font-mono mb-4">GOVERNANCE</div>
                <h3 className="text-xl font-bold text-primary mb-4">Compliance & Ethical Conduct</h3>
                <ul className="text-secondary text-sm space-y-2">
                  <li>• Full regulatory adherence (PF, ESI, WC)</li>
                  <li>• Anti-bribery & corruption policies</li>
                  <li>• Transparent permit management</li>
                  <li>• Third-party audit compliance</li>
                </ul>
              </div>
            </div>

            {/* ESG Performance Tracking */}
            <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium mb-16">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="text-accent-amber text-sm font-mono mb-4">PERFORMANCE TRACKING</div>
                  <h3 className="text-2xl font-bold text-primary mb-6">
                    Real-Time ESG Monitoring & Reporting
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-secondary">Digital reporting modules for energy, water, and waste data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-secondary">Monthly safety incident and training compliance reports</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-secondary">Automated compliance verification and permit tracking</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-accent-amber rounded-full"></div>
                      <span className="text-secondary">Third-party audits for high-value projects</span>
                    </div>
                  </div>
                </div>
                <div className="bg-neutral-medium p-6 rounded-lg">
                  <div className="text-accent-amber text-sm font-mono mb-4">LIVE ESG METRICS</div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-secondary">Waste Diversion Rate</span>
                      <span className="text-green-400 font-bold">92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Local Employment</span>
                      <span className="text-blue-400 font-bold">78%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Safety Compliance</span>
                      <span className="text-purple-400 font-bold">100%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">ESG Gold Partners</span>
                      <span className="text-accent-amber font-bold">47</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ESG Incentives */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-accent-amber/10 to-accent-amber/5 p-8 rounded-lg border border-accent-amber/20">
                <div className="text-accent-amber text-sm font-mono mb-4">FINANCIAL INCENTIVES</div>
                <h3 className="text-xl font-bold text-primary mb-4">ESG Performance Rewards</h3>
                <ul className="text-secondary text-sm space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-amber">•</span>
                    <span>Preferential revenue share rates for ESG Gold Partners</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-amber">•</span>
                    <span>Lower interest rates through NBFC partnerships</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-amber">•</span>
                    <span>Priority access to future funding opportunities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-amber">•</span>
                    <span>Performance-linked fee rebates on successful completion</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-lg border border-primary/20">
                <div className="text-primary text-sm font-mono mb-4">VALUE-ADD BENEFITS</div>
                <h3 className="text-xl font-bold text-primary mb-4">Partnership & Recognition</h3>
                <ul className="text-secondary text-sm space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>"Invero Green Project" certification and branding</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Featured case studies and marketing visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Access to sustainability training and best practices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Networking with MNC clients and industry leaders</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ESG Impact Reporting Section */}
      <section className="bg-gradient-to-br from-neutral-darker to-neutral-dark py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-green-400 text-sm font-semibold uppercase tracking-wide mb-4">
                IMPACT MEASUREMENT
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
                Transparent ESG Impact Reporting
              </h2>
              <p className="text-lg text-secondary max-w-3xl mx-auto">
                Comprehensive impact measurement and reporting for institutional investors seeking measurable ESG outcomes alongside financial returns.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <div className="bg-neutral-medium p-8 rounded-lg border border-neutral-medium">
                  <div className="text-accent-amber text-sm font-mono mb-4">QUARTERLY IMPACT DASHBOARD</div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">2,847 T</div>
                        <div className="text-xs text-secondary">CO₂ Emissions Avoided</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">14,283</div>
                        <div className="text-xs text-secondary">Local Jobs Created</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400 mb-1">₹127 Cr</div>
                        <div className="text-xs text-secondary">Community Investment</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-accent-amber mb-1">892K L</div>
                        <div className="text-xs text-secondary">Water Conserved</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-neutral-dark">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary">ESG Compliance Score</span>
                        <span className="text-green-400 font-bold">94.2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-primary mb-6">
                  Investor-Grade ESG Reporting
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-primary mb-2">Standardized ESG Metrics</h4>
                      <p className="text-secondary text-sm">
                        Aligned with SEBI ESG guidelines and international frameworks (GRI, SASB) for institutional investor compliance.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-primary mb-2">Real-Time Impact Tracking</h4>
                      <p className="text-secondary text-sm">
                        Live dashboards and automated data collection providing up-to-date ESG performance across your portfolio.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-purple-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-primary mb-2">Third-Party Verification</h4>
                      <p className="text-secondary text-sm">
                        Independent ESG audits and certifications ensuring data integrity and regulatory compliance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Portfolio-Level ESG Summary */}
            <div className="bg-neutral-medium p-8 rounded-lg border border-neutral-medium">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-primary mb-4">Portfolio ESG Performance Summary</h3>
                <p className="text-secondary text-sm max-w-2xl mx-auto">
                  Aggregate impact metrics across ₹2.4B in deployed capital, demonstrating measurable ESG outcomes.
                </p>
              </div>
              
              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="bg-green-400/10 w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="text-green-400 text-2xl">🌱</div>
                  </div>
                  <div className="text-xl font-bold text-green-400 mb-1">85%</div>
                  <div className="text-sm text-secondary">Projects Meet Environmental Standards</div>
                </div>
                
                <div className="text-center">
                  <div className="bg-blue-400/10 w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="text-blue-400 text-2xl">👥</div>
                  </div>
                  <div className="text-xl font-bold text-blue-400 mb-1">92%</div>
                  <div className="text-sm text-secondary">Social Compliance Rate</div>
                </div>
                
                <div className="text-center">
                  <div className="bg-purple-400/10 w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="text-purple-400 text-2xl">⚖️</div>
                  </div>
                  <div className="text-xl font-bold text-purple-400 mb-1">98%</div>
                  <div className="text-sm text-secondary">Governance Standards Met</div>
                </div>
                
                <div className="text-center">
                  <div className="bg-accent-amber/10 w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="text-accent-amber text-2xl">📈</div>
                  </div>
                  <div className="text-xl font-bold text-accent-amber mb-1">+1.4%</div>
                  <div className="text-sm text-secondary">ESG Premium vs Market</div>
                </div>
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

            <div className="grid lg:grid-cols-4 gap-8">
              {/* ESG Investment Trends */}
              <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium hover-lift">
                <div className="text-green-400 text-sm font-mono mb-4">ESG INVESTMENT SURGE</div>
                <h3 className="text-xl font-bold text-primary mb-4">
                  India's $30B ESG Infrastructure Push
                </h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">ESG AUM Growth</span>
                    <span className="text-green-400 font-bold">285%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">Green Bonds</span>
                    <span className="text-success font-bold">₹2.3T</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary text-sm">ESG Premium</span>
                    <span className="text-accent-amber font-bold">1.2-1.8%</span>
                  </div>
                </div>
                <p className="text-secondary text-sm leading-relaxed mb-4">
                  Institutional investors increasingly prioritize ESG-compliant infrastructure projects, driving capital allocation towards sustainable development.
                </p>
                <div className="text-xs text-secondary">
                  Source: SEBI ESG Guidelines 2024, India ESG Report
                </div>
              </div>

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
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="text-green-400 text-2xl mb-2">🌱</div>
                  <h4 className="text-sm font-semibold text-primary mb-2">ESG Framework</h4>
                  <p className="text-xs text-secondary">Sustainable project execution standards and impact measurement</p>
                </div>
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
              Join the ESG-integrated revolution in project financing. 
              Access sustainable capital or deploy it with unprecedented transparency, impact measurement, and control.
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