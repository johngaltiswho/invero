import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function InvestorsPage() {
  return (
    <Layout>
      <div className="public-page min-h-screen">
        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-4xl">
              <div className="public-kicker mb-5">For Investors</div>
              <h1 className="font-public-display public-heading text-5xl md:text-7xl leading-[0.92] tracking-[-0.04em]">
                Private capital participation in
                <span className="block public-accent italic">India&apos;s real economy.</span>
              </h1>
              <p className="public-body mt-10 max-w-3xl text-xl leading-9">
                Finverno gives private investors a structured way to participate in short-duration deployment cycles
                linked to procurement and execution across real SME business movement.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/invest">
                  <Button variant="primary" className="public-button px-8 py-3 hover:bg-[#d7ad58]">
                    View Investor Access
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="secondary" className="public-button-outline px-8 py-3 hover:bg-[#c79a36]/10">
                    Request A Discussion
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="public-panel p-8 md:p-10">
                <div className="public-kicker mb-4">What Investors Are Accessing</div>
                <h2 className="font-public-display text-4xl md:text-5xl text-primary leading-tight">
                  Not abstract finance.
                  <span className="block public-accent italic">Actual business movement.</span>
                </h2>
                <p className="public-body mt-8 text-lg leading-9">
                  The Finverno model is built around procurement enablement and working-capital timing for SMEs
                  executing confirmed industrial and infrastructure work. The investor side is designed to sit on top
                  of that operating layer, not separate from it.
                </p>
              </div>

              <div className="public-panel p-8 md:p-10">
                <div className="public-kicker mb-4">Current Structures</div>
                <div className="space-y-0 border border-white/10">
                  {[
                    ['Pool Participation', '21 - 24% illustrative'],
                    ['Fixed Income', '14% p.a.'],
                    ['Typical Rotation', '90 - 120 days'],
                    ['Liquidity', 'Collection-linked'],
                    ['Ticket Size', '₹50k - ₹1L'],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 px-5 py-5 last:border-b-0">
                      <div className="font-mono text-sm text-[#8f887a]">{label}</div>
                      <div className={`text-right font-mono ${label.includes('Participation') || label === 'Fixed Income' ? 'text-[#d2aa4d]' : 'text-[#f0ebe0]'}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="public-body mt-6 text-sm leading-7">
                  Illustrative figures only. Returns, timing, and allocation structure depend on the selected model,
                  deployment cycles, collections, and final legal documentation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mb-12">
              <div className="public-kicker mb-4">Our Approach</div>
              <h2 className="font-public-display text-4xl md:text-5xl text-primary">A clearer way to participate.</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                [
                  '01',
                  'Operating visibility first',
                  'Finverno starts with procurement workflow, project visibility, and actual execution movement before structuring capital participation.',
                ],
                [
                  '02',
                  'Two investor formats',
                  'Investors can choose between pooled participation economics and a simpler fixed-income structure depending on return preference.',
                ],
                [
                  '03',
                  'Collection-linked liquidity',
                  'This is not an on-demand withdrawal product. Payout timing depends on rotation, collections, and liquidity generated from underlying business cycles.',
                ],
              ].map(([step, title, body]) => (
                <div key={step} className="public-panel-soft p-8">
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
            <div className="grid gap-8 md:grid-cols-2">
              <div className="public-panel p-8">
                <div className="public-kicker mb-4">Pool Participation</div>
                <h3 className="font-public-display text-3xl text-primary mb-5">Higher upside, more variability.</h3>
                <p className="public-body leading-8">
                  Capital participates in pool economics rather than a simple fixed coupon. This structure is better
                  suited to investors comfortable with realized profit variability and collection-linked timing.
                </p>
              </div>
              <div className="public-panel p-8">
                <div className="public-kicker mb-4">Fixed Income</div>
                <h3 className="font-public-display text-3xl text-primary mb-5">Simpler income visibility.</h3>
                <p className="public-body leading-8">
                  A private lending arrangement at a fixed return accrued on deployed capital, with payout timing still
                  linked to collections and liquidity generated across short-duration cycles.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="public-panel p-10 md:p-12 text-center">
              <div className="public-kicker mb-4">Private Access</div>
              <h2 className="font-public-display text-4xl md:text-5xl text-primary mb-6">
                Explore the current investor note.
              </h2>
              <p className="public-body max-w-3xl mx-auto text-lg leading-9">
                The detailed private-access page includes the current structures, an illustrative calculator, and a
                request flow for the investor note and sample term sheet.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/invest">
                  <Button variant="primary" className="public-button px-8 py-3 hover:bg-[#d7ad58]">
                    Go To Investor Access
                  </Button>
                </Link>
                <Button variant="secondary" className="public-button-outline px-8 py-3 hover:bg-[#c79a36]/10">
                  <a href="/dashboard/investor" className="flex items-center space-x-2">
                    <span>Existing Investor Dashboard</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
