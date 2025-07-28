import { Layout, Button, Input } from '@/components';
import Link from 'next/link';

export default function InvestorInquirePage(): React.ReactElement {
  return (
    <Layout>
      {/* Header Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-8 leading-tight">
            Investment <span className="accent-orange">Inquiry</span>
          </h1>
          <p className="text-xl text-secondary mb-8 leading-relaxed">
            Complete the form below to express your interest in our pilot investment program. 
            Our investment team will review your inquiry and schedule a personalized consultation.
          </p>
        </div>
      </section>

      {/* Investment Inquiry Form */}
      <section className="bg-neutral-dark py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-neutral-medium p-8 rounded-lg">
              <h2 className="text-2xl font-bold text-primary mb-8 text-center">
                Pilot Investment Program Application
              </h2>
              
              <form className="space-y-6">
                {/* Personal Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name *"
                    placeholder="Enter your full name"
                    type="text"
                    required
                  />
                  <Input
                    label="Email Address *"
                    placeholder="your@email.com"
                    type="email"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Phone Number *"
                    placeholder="+91 98765 43210"
                    type="tel"
                    required
                  />
                  <Input
                    label="City *"
                    placeholder="Mumbai"
                    type="text"
                    required
                  />
                </div>

                {/* Investment Profile */}
                <div className="pt-6 border-t border-neutral-dark">
                  <h3 className="text-xl font-bold text-primary mb-4">Investment Profile</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Investor Type *
                      </label>
                      <select className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark">
                        <option value="">Select investor type</option>
                        <option value="individual">Individual Investor</option>
                        <option value="hni">High Net Worth Individual</option>
                        <option value="family-office">Family Office</option>
                        <option value="institutional">Institutional Investor</option>
                        <option value="corporate">Corporate Treasury</option>
                      </select>
                    </div>
                    <Input
                      label="Investment Amount Interest *"
                      placeholder="₹ 5,00,000"
                      type="text"
                      required
                      helperText="Minimum: ₹50,000"
                    />
                  </div>
                </div>

                {/* Investment Experience */}
                <div className="pt-6 border-t border-neutral-dark">
                  <h3 className="text-xl font-bold text-primary mb-4">Investment Experience</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Investment Experience *
                      </label>
                      <select className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark">
                        <option value="">Select experience level</option>
                        <option value="beginner">Beginner (0-2 years)</option>
                        <option value="intermediate">Intermediate (2-5 years)</option>
                        <option value="experienced">Experienced (5-10 years)</option>
                        <option value="expert">Expert (10+ years)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Risk Appetite *
                      </label>
                      <select className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark">
                        <option value="">Select risk appetite</option>
                        <option value="conservative">Conservative</option>
                        <option value="moderate">Moderate</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-primary mb-2">
                      Previous Alternative Investment Experience
                    </label>
                    <textarea
                      className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:risk-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                      placeholder="Please describe any experience with alternative investments (private equity, debt funds, real estate, etc.)"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Investment Preferences */}
                <div className="pt-6 border-t border-neutral-dark">
                  <h3 className="text-xl font-bold text-primary mb-4">Investment Preferences</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="Target IRR Expectation"
                      placeholder="e.g., 12-15%"
                      type="text"
                      helperText="Our pilot targets 12-14% IRR"
                    />
                    <Input
                      label="Preferred Tenure"
                      placeholder="e.g., 3-9 months"
                      type="text"
                      helperText="Our pilot offers 3-9 month tenures"
                    />
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-primary mb-2">
                      Additional Questions or Comments
                    </label>
                    <textarea
                      className="w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-all duration-200 border-neutral-medium hover:border-neutral-dark"
                      placeholder="Any specific questions about the investment opportunity or additional information you'd like to share"
                      rows={4}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-8 text-center">
                  <Button variant="primary" size="lg" type="submit">
                    Submit Investment Inquiry
                  </Button>
                  <p className="text-sm text-secondary mt-4">
                    By submitting this inquiry, you acknowledge that investments are subject to market risks and regulatory requirements.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Highlights */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-primary mb-8 text-center">
              What to Expect Next
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl accent-orange mb-4">1️⃣</div>
                <h3 className="text-lg font-bold text-primary mb-2">Review & Qualification</h3>
                <p className="text-secondary">Our team will review your inquiry and assess qualification within 48 hours.</p>
              </div>
              <div className="text-center">
                <div className="text-3xl accent-orange mb-4">2️⃣</div>
                <h3 className="text-lg font-bold text-primary mb-2">Personalized Consultation</h3>
                <p className="text-secondary">Schedule a detailed discussion about investment opportunities and process.</p>
              </div>
              <div className="text-center">
                <div className="text-3xl accent-orange mb-4">3️⃣</div>
                <h3 className="text-lg font-bold text-primary mb-2">Investment Documentation</h3>
                <p className="text-secondary">Complete due diligence and documentation for your investment.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Investors */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <Link href="/investors">
            <Button variant="outline" size="md">
              ← Back to Investors Page
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}