import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function AboutUs() {
  return (
    <Layout>
      <div className="public-page min-h-screen">
        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-4xl">
              <div className="public-kicker mb-5">About Finverno</div>
              <h1 className="font-public-display public-heading text-5xl md:text-7xl leading-[0.92] tracking-[-0.04em]">
                Building the operating layer for
                <span className="block public-accent italic">SME execution in India.</span>
              </h1>
              <p className="public-body mt-10 max-w-3xl text-xl leading-9">
                Finverno is building procurement and working-capital infrastructure for SMEs executing real industrial
                and infrastructure work. We help businesses move from confirmed demand to actual execution by making
                supply, vendor coordination, visibility, and capital movement more structured.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/contractors">
                  <Button variant="primary" className="public-button px-8 py-3 hover:bg-[#d7ad58]">
                    For SMEs
                  </Button>
                </Link>
                <Link href="/invest">
                  <Button variant="secondary" className="public-button-outline px-8 py-3 hover:bg-[#c79a36]/10">
                    Investor Access
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="public-panel p-8">
                <div className="public-kicker mb-4">Our Mission</div>
                <h2 className="font-public-display text-3xl text-primary mb-5">Make execution easier for real businesses.</h2>
                <p className="public-body leading-8">
                  We want capable SMEs to execute faster and more confidently by reducing procurement friction,
                  improving operational visibility, and enabling cleaner access to the working capital required to move.
                </p>
              </div>

              <div className="public-panel p-8">
                <div className="public-kicker mb-4">Our Vision</div>
                <h2 className="font-public-display text-3xl text-primary mb-5">A stronger operating backbone for India.</h2>
                <p className="public-body leading-8">
                  India&apos;s growth depends on thousands of smaller businesses that actually build, supply, install,
                  and deliver. Finverno exists to strengthen that layer with better systems, better coordination,
                  and better capital access.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mb-12 max-w-4xl">
              <div className="public-kicker mb-4">The Problem</div>
              <h2 className="font-public-display text-4xl md:text-5xl text-primary leading-tight">
                The contracts exist. The execution layer is what breaks.
              </h2>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="public-panel-soft p-8">
                <h3 className="font-public-display text-3xl text-primary mb-6">Why SMEs get stuck</h3>
                <div className="space-y-5">
                  {[
                    'Procurement has to happen before collections arrive.',
                    'Vendor coordination is fragmented across calls, spreadsheets, and informal follow-up.',
                    'Traditional finance is too slow or too rigid for short operating cycles.',
                    'Project visibility is weak, so trust and execution confidence both suffer.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-3 h-2 w-2 rounded-full bg-[#c79a36]" />
                      <p className="public-body">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="public-panel-soft p-8">
                <h3 className="font-public-display text-3xl text-primary mb-6">What Finverno changes</h3>
                <div className="space-y-5">
                  {[
                    'A structured procurement workflow instead of ad hoc coordination.',
                    'Cleaner project-side visibility for approvals, requirements, and execution tracking.',
                    'A controlled path to working-capital support around real business movement.',
                    'A more transparent model for both SMEs and capital partners.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-3 h-2 w-2 rounded-full bg-[#d2aa4d]" />
                      <p className="public-body">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mb-12">
              <div className="public-kicker mb-4">How It Works</div>
              <h2 className="font-public-display text-4xl md:text-5xl text-primary">Three layers, one operating system.</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                [
                  '01',
                  'Verify and onboard',
                  'We start with business identity, GST-led review, and operational onboarding so the SME can move into the platform quickly.',
                ],
                [
                  '02',
                  'Enable procurement',
                  'Finverno structures the procurement workflow around project requirements, vendors, and execution milestones.',
                ],
                [
                  '03',
                  'Support execution',
                  'Where appropriate, the model can also support short-duration capital participation aligned to real business cycles.',
                ],
              ].map(([step, title, body]) => (
                <div key={step} className="public-panel p-8">
                  <div className="public-kicker mb-6">{step}</div>
                  <h3 className="font-public-display text-3xl text-primary mb-5">{title}</h3>
                  <p className="public-body leading-8">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mb-12">
              <div className="public-kicker mb-4">What We Believe</div>
              <h2 className="font-public-display text-4xl md:text-5xl text-primary">Trust comes from structure, not slogans.</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-5">
              {[
                ['Transparency', 'Clear workflows, visible movement, and auditable operations.'],
                ['Alignment', 'The platform should work for SMEs, vendors, and capital partners together.'],
                ['Integrity', 'No shortcuts in verification, execution, or communication.'],
                ['Dignity', 'SMEs are not informal edge cases. They are core to the economy.'],
                ['Purpose', 'Everything we build should help real businesses execute better.'],
              ].map(([title, body]) => (
                <div key={title} className="public-panel-soft p-6">
                  <h3 className="text-lg font-semibold text-primary mb-3">{title}</h3>
                  <p className="text-sm public-body leading-7">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="public-panel p-10 md:p-12 text-center">
              <div className="public-kicker mb-4">Next Step</div>
              <h2 className="font-public-display text-4xl md:text-5xl text-primary mb-6">
                Build with Finverno.
              </h2>
              <p className="public-body max-w-3xl mx-auto text-lg leading-9">
                Whether you are an SME looking to streamline procurement and execution, or an investor evaluating the
                platform&apos;s capital model, we&apos;re happy to share more context.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/contractors/apply">
                  <Button variant="primary" className="public-button px-8 py-3 hover:bg-[#d7ad58]">
                    Start SME Onboarding
                  </Button>
                </Link>
                <Link href="/invest">
                  <Button variant="secondary" className="public-button-outline px-8 py-3 hover:bg-[#c79a36]/10">
                    View Investor Page
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
