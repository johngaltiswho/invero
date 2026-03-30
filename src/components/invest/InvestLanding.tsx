'use client';

import Link from 'next/link';
import { Cormorant_Garamond } from 'next/font/google';
import { FormEvent, useMemo, useState, useTransition } from 'react';

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Prospective', lastName: 'Investor' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Investor' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function formatLakhs(amount: number): string {
  return `₹${(amount / 100000).toFixed(2)} L`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const editorialSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export default function InvestLanding(): React.ReactElement {
  const [calculatorMode, setCalculatorMode] = useState<'fixed_income' | 'pool_participation'>('fixed_income');
  const [amountLakhs, setAmountLakhs] = useState(10);
  const [months, setMonths] = useState(9);
  const [annualRate, setAnnualRate] = useState(14);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [isPending, startTransition] = useTransition();

  const projection = useMemo(() => {
    const principal = amountLakhs * 100000;
    const monthlyRate = annualRate / 12 / 100;

    if (calculatorMode === 'pool_participation') {
      const hurdleRate = 12 / 12 / 100;
      const grossMonthlyEarn = principal * monthlyRate;
      const managementFee = principal * (2 / 12 / 100);
      const excessAboveHurdle = Math.max(grossMonthlyEarn - principal * hurdleRate, 0);
      const performanceFee = excessAboveHurdle * 0.2;
      const netMonthlyEarn = grossMonthlyEarn - managementFee - performanceFee;
      const totalEarn = netMonthlyEarn * months;
      const maturity = principal + totalEarn;

      const rows = Array.from({ length: months }, (_, index) => {
        const cumulative = netMonthlyEarn * (index + 1);
        return {
          month: `Month ${index + 1}`,
          monthlyEarn: netMonthlyEarn,
          cumulative,
          balance: principal + cumulative,
        };
      });

      return {
        principal,
        monthlyRatePercent: monthlyRate * 100,
        monthlyEarn: netMonthlyEarn,
        totalEarn,
        maturity,
        rows,
      };
    }

    const monthlyEarn = principal * monthlyRate;
    const totalEarn = monthlyEarn * months;
    const maturity = principal + totalEarn;

    const rows = Array.from({ length: months }, (_, index) => {
      const cumulative = monthlyEarn * (index + 1);
      return {
        month: `Month ${index + 1}`,
        monthlyEarn,
        cumulative,
        balance: principal + cumulative,
      };
    });

    return {
      principal,
      monthlyRatePercent: monthlyRate * 100,
      monthlyEarn,
      totalEarn,
      maturity,
      rows,
    };
  }, [amountLakhs, months, annualRate, calculatorMode]);

  const calculatorConfig = useMemo(() => {
    if (calculatorMode === 'pool_participation') {
      return {
        title: 'Pool Participation',
        summaryLabel: 'Illustrative net to investor',
        tenorLabel: 'Pool rotation window',
        rateLabel: 'Illustrative annual outcome',
        explanation:
          'Illustrative pool-style outcome after management fee and carry above hurdle. Realized pool returns depend on collections, rotation, and actual profit realization.',
        earnLabel: 'Illustrative Monthly Net',
        benchmarks: [
          ['Finverno Pooled Capital', '21-24%', 'Variable return, pool-rotation risk, collection-timing variability'],
          ['Finverno Fixed Income', '14%', 'Lower variability, collection-linked liquidity, deployed-capital accrual'],
          ['Cat II AIF / Private Debt', '~15%', 'Manager discretion, longer lock-ins, lower liquidity visibility'],
          ['Fixed Deposit (Top Banks)', '~7.25%', 'Low risk, low return, fixed-bank product'],
        ] as const,
      };
    }

    return {
      title: 'Fixed Income',
      summaryLabel: 'Net to investor at maturity',
      tenorLabel: 'Tenor',
      rateLabel: 'Annual rate',
      explanation: 'Simple interest • daily accrual shown illustratively • payout timing remains collection-linked',
      earnLabel: 'Monthly Earn',
      benchmarks: [
        ['Finverno Fixed Income', `${annualRate.toFixed(1)}%`, 'Collection-linked liquidity, lower volatility, fixed-return structure'],
        ['Finverno Pooled Capital', '21-24%', 'Higher upside, profit-linked variability, pool-performance risk'],
        ['Cat II AIF / Private Debt', '~15%', 'Manager discretion, longer lock-ins, lower liquidity visibility'],
        ['Fixed Deposit (Top Banks)', '~7.25%', 'Low risk, low return, fixed-bank product'],
      ] as const,
    };
  }, [annualRate, calculatorMode]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        const parsed = splitName(name);
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            email,
            company: 'Prospective Investor',
            subject: 'investor',
            message: `Investor note request from /invest page. Name: ${name || 'Not provided'}. Illustrative ${calculatorMode === 'pool_participation' ? 'pool participation' : 'fixed income'} scenario viewed: ${formatLakhs(projection.principal)} for ${months} months at ${annualRate}% p.a.`,
            consent: true,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to submit request');
        }

        setStatus({
          type: 'success',
          message: 'Request received. We will share the investor note and follow up shortly.',
        });
        setEmail('');
        setName('');
      } catch (error) {
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to submit request',
        });
      }
    });
  };

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f3efe6]">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-6 py-7 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="text-sm uppercase tracking-[0.35em] text-[#c79a36]">
              Finverno
            </Link>
            <div className="flex items-center gap-8 text-xs uppercase tracking-[0.32em] text-[#8f887a]">
              <span>Private Investor Access</span>
              <span>India 2026</span>
              <a
                href="#request-note"
                className="border border-[#c79a36]/70 px-5 py-3 text-[#d2aa4d] transition hover:bg-[#c79a36]/10"
              >
                Request Note
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-6 py-16 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:px-14 lg:py-20">
          <div className="pr-0 lg:pr-10">
            <div className="mb-8 text-xs uppercase tracking-[0.35em] text-[#c79a36]">
              Private Investor Window
            </div>
            <h1
              className={`${editorialSerif.className} max-w-4xl text-[clamp(3.7rem,7vw,7.5rem)] leading-[0.92] tracking-[-0.04em] text-[#f6f1e8]`}
            >
              Capital for
              <span className="block text-[#d0a441] italic">India&apos;s industrial</span>
              backbone.
            </h1>
            <p className="mt-12 max-w-2xl text-lg leading-9 text-[#9a9488]">
              Finverno is building a material procurement and working-capital enablement layer for contractors and SMEs
              executing real industrial work. For investors, this opens two structured ways to participate in short-duration
              deployment cycles tied to real business movement.
            </p>
          </div>

          <div className="border-l-0 border-white/10 pt-2 lg:border-l lg:pl-12">
            <div className="mb-6 flex items-center gap-4 text-xs uppercase tracking-[0.32em] text-[#8f887a]">
              <span>Investment Terms</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="space-y-0 border border-white/10">
              {[
                ['Options', 'Pool Participation • Fixed Income'],
                ['Pool Participation ROI', '21 - 24% illustrative'],
                ['Fixed Income ROI', '14% p.a.'],
                ['Rotation', '90 - 120 days typical'],
                ['Liquidity', 'Collection-linked, not on-demand'],
                ['Ticket Size', '₹50k - ₹1L'],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] gap-6 border-b border-white/10 px-6 py-6 last:border-b-0">
                  <div className="text-xs uppercase tracking-[0.25em] text-[#7f7a71]">{label}</div>
                  <div
                    className={`text-right ${
                      label.includes('ROI') ? 'text-[#d2aa4d]' : 'text-[#f0ebe0]'
                    }`}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border border-[#c79a36]/35 bg-[#171410] px-6 py-5 text-sm leading-7 text-[#aba392]">
              This page is for private information and early evaluation only. Returns, payout timing, and allocation
              structure depend on the selected model, deployment cycles, and collections.
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="mb-6 text-xs uppercase tracking-[0.35em] text-[#c79a36]">What We&apos;re Building</div>
          <div className="max-w-5xl">
            <h2
              className={`${editorialSerif.className} text-[clamp(2.5rem,4.8vw,4.7rem)] leading-[1] tracking-[-0.04em] text-[#f6f1e8]`}
            >
              India&apos;s small businesses have the contracts.
              <br />
              We give them the <span className="italic text-[#d0a441]">capital</span>.
            </h2>
            <p className="mt-10 max-w-4xl text-lg leading-10 text-[#9a9488]">
              Across industrial and infrastructure supply chains, capable SMEs are routinely constrained not by lack of
              demand but by lack of working capital at the moment procurement has to happen. Finverno is being built to
              bridge that gap through procurement enablement, project visibility, and investor capital participation in
              short-duration business cycles.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
          <div className="mb-6 text-xs uppercase tracking-[0.35em] text-[#c79a36]">Capital Deployment</div>
          <h2
            className={`${editorialSerif.className} mb-12 text-[clamp(2.4rem,4.5vw,4.2rem)] leading-[1] tracking-[-0.04em] text-[#f6f1e8]`}
          >
            Two ways to <span className="italic text-[#d0a441]">participate</span>
          </h2>

          <div className="grid gap-0 border border-white/10 lg:grid-cols-2">
            <div className="border-b border-white/10 px-8 py-10 lg:border-b-0 lg:border-r lg:border-white/10">
              <div className="mb-8 text-xs uppercase tracking-[0.35em] text-[#c79a36]">Option A</div>
              <h3
                className={`${editorialSerif.className} text-[clamp(2rem,3vw,3rem)] leading-none text-[#f6f1e8]`}
              >
                Pool Participation
              </h3>
              <div className="mt-4 text-xs uppercase tracking-[0.32em] text-[#7f7a71]">
                Variable Return • Portfolio Model
              </div>
              <p className="mt-10 max-w-2xl text-lg leading-9 text-[#9a9488]">
                Capital is deployed across a pool of working-capital transactions rather than any single receivable.
                Returns follow pool economics, allowing higher upside alongside more variability in timing and realized yield.
              </p>
              <div className="mt-10 border-t border-white/10">
                {[
                  ['Hurdle Rate', '12% p.a.'],
                  ['Management Fee', '2% p.a. on deployed capital'],
                  ['Performance Fee', '20% on profits above hurdle'],
                  ['Liquidity', 'Follows pool rotation'],
                  ['Best Suited For', 'Higher upside, variable returns'],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto] gap-6 border-b border-white/10 py-5">
                    <div className="font-mono text-sm text-[#858073]">{label}</div>
                    <div className="text-right font-mono text-[#f0ebe0]">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 py-10">
              <div className="mb-8 text-xs uppercase tracking-[0.35em] text-[#c79a36]">Option B</div>
              <h3
                className={`${editorialSerif.className} text-[clamp(2rem,3vw,3rem)] leading-none text-[#f6f1e8]`}
              >
                Fixed Income
              </h3>
              <div className="mt-4 text-xs uppercase tracking-[0.32em] text-[#7f7a71]">
                Fixed Return • Private Lending
              </div>
              <p className="mt-10 max-w-2xl text-lg leading-9 text-[#9a9488]">
                A private lending arrangement where capital is lent to Finverno at a fixed return, accrued daily on
                capital that is actually deployed. Capital typically rotates across short-duration receivable-backed
                transactions within 90-120 days based on experience.
              </p>
              <div className="mt-10 border-t border-white/10">
                {[
                  ['Fixed Return', '14% p.a.'],
                  ['Accrual', 'Daily on deployed capital'],
                  ['Typical Rotation', '90 - 120 days'],
                  ['Liquidity', 'Withdrawal on collection cycle'],
                  ['Best Suited For', 'Income visibility, fixed yield'],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto] gap-6 border-b border-white/10 py-5">
                    <div className="font-mono text-sm text-[#858073]">{label}</div>
                    <div className={`text-right font-mono ${label === 'Fixed Return' ? 'text-[#d2aa4d]' : 'text-[#f0ebe0]'}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 border border-white/10 px-6 py-4 text-sm leading-7 text-[#8f887a]">
            Neither option is an on-demand withdrawal product, a guaranteed-return instrument, or a fixed-date repayment
            product. Liquidity in both models depends on collections and transaction rotation. Final allocation and legal
            terms are shared only at proposal and agreement stage.
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-[1600px] gap-16 px-6 py-16 sm:px-10 lg:grid-cols-[1fr_1fr] lg:px-14 lg:py-20">
          <div className="lg:pr-10">
            <div className="mb-6 text-xs uppercase tracking-[0.35em] text-[#c79a36]">Illustrative Calculator</div>
            <h2
              className={`${editorialSerif.className} text-[clamp(2.4rem,4.5vw,4rem)] leading-[1] tracking-[-0.04em] text-[#f6f1e8]`}
            >
              Model your <span className="italic text-[#d0a441]">scenario</span>
            </h2>
            <div className="mt-12 space-y-12">
              <div>
                <div className="mb-4 text-xs uppercase tracking-[0.28em] text-[#8f887a]">Choose model</div>
                <div className="inline-flex border border-white/10 bg-[#131311] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorMode('fixed_income');
                      setAnnualRate(14);
                    }}
                    className={`px-5 py-3 text-xs uppercase tracking-[0.28em] transition ${
                      calculatorMode === 'fixed_income'
                        ? 'bg-[#c79a36] text-[#171410]'
                        : 'text-[#9a9488] hover:text-[#f0ebe0]'
                    }`}
                  >
                    Fixed Income
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorMode('pool_participation');
                      setAnnualRate((current) => (current < 16 ? 18 : current));
                    }}
                    className={`px-5 py-3 text-xs uppercase tracking-[0.28em] transition ${
                      calculatorMode === 'pool_participation'
                        ? 'bg-[#c79a36] text-[#171410]'
                        : 'text-[#9a9488] hover:text-[#f0ebe0]'
                    }`}
                  >
                    Pool Participation
                  </button>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#8f887a]">
                  <span>Investment Amount</span>
                  <span className="text-[#d2aa4d]">{formatLakhs(projection.principal)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={amountLakhs}
                  onChange={(event) => setAmountLakhs(Number(event.target.value))}
                  className="w-full accent-[#d0a441]"
                />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#8f887a]">
                  <span>{calculatorConfig.tenorLabel}</span>
                  <span className="text-[#d2aa4d]">{months} months</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  step={1}
                  value={months}
                  onChange={(event) => setMonths(Number(event.target.value))}
                  className="w-full accent-[#d0a441]"
                />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#8f887a]">
                  <span>{calculatorConfig.rateLabel}</span>
                  <span className="text-[#d2aa4d]">{annualRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={calculatorMode === 'fixed_income' ? 12 : 14}
                  max={calculatorMode === 'fixed_income' ? 14 : 24}
                  step={0.5}
                  value={annualRate}
                  onChange={(event) => setAnnualRate(Number(event.target.value))}
                  className="w-full accent-[#d0a441]"
                />
              </div>
            </div>

            <div className="mt-12 border-t border-white/10 pt-8">
              <div className="mb-5 text-xs uppercase tracking-[0.32em] text-[#8f887a]">Illustrative Context</div>
              <div className="overflow-hidden border border-white/10">
                <div className="grid grid-cols-[1.2fr_0.5fr_1fr] border-b border-white/10 bg-white/[0.02] px-4 py-4 text-xs uppercase tracking-[0.28em] text-[#8f887a]">
                  <div>Investment</div>
                  <div className="text-right">ROI</div>
                  <div className="text-right">Risk / Liquidity</div>
                </div>
                {calculatorConfig.benchmarks.map(([label, value, risk]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[1.2fr_0.5fr_1fr] border-b border-white/10 px-4 py-4 text-sm last:border-b-0"
                  >
                    <div className={label.startsWith('Finverno') ? 'font-mono text-[#f0ebe0]' : 'font-mono text-[#8f887a]'}>
                      {label}
                    </div>
                    <div className={`text-right font-mono ${label.startsWith('Finverno') ? 'text-[#d2aa4d]' : 'text-[#f0ebe0]'}`}>
                      {value}
                    </div>
                    <div className="text-right text-[#8f887a]">{risk}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-l-0 border-white/10 pt-2 lg:border-l lg:pl-12">
            <div className="mb-6 text-xs uppercase tracking-[0.35em] text-[#c79a36]">
              {calculatorMode === 'pool_participation' ? 'Illustrative Pool Outcome' : 'Month-by-Month Breakdown'}
            </div>
            <h2
              className={`${editorialSerif.className} text-[clamp(2.4rem,4.5vw,4rem)] leading-[1] tracking-[-0.04em] text-[#f6f1e8]`}
            >
              Your <span className="italic text-[#d0a441]">{calculatorMode === 'pool_participation' ? 'outcome' : 'returns'}</span>
            </h2>
            <div className="mt-8">
              <div className="text-xs uppercase tracking-[0.32em] text-[#8f887a]">{calculatorConfig.summaryLabel}</div>
              <div
                className={`${editorialSerif.className} mt-3 text-[clamp(3.6rem,7vw,5.6rem)] leading-none text-[#d2aa4d]`}
              >
                {formatLakhs(projection.maturity)}
              </div>
              <div className="mt-3 text-base text-[#8f887a]">
                {calculatorConfig.explanation}
              </div>
            </div>

            <div className="mt-10 overflow-hidden border border-white/10">
              <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.02] px-4 py-4 text-xs uppercase tracking-[0.28em] text-[#8f887a]">
                <div>Month</div>
                <div className="text-right">{calculatorConfig.earnLabel}</div>
                <div className="text-right">Cumulative</div>
                <div className="text-right">Balance</div>
              </div>
              {projection.rows.map((row) => (
                <div key={row.month} className="grid grid-cols-[1.1fr_1fr_1fr_1fr] border-b border-white/10 px-4 py-4 text-sm last:border-b-0">
                  <div className="text-[#8f887a]">{row.month}</div>
                  <div className="text-right text-[#d2aa4d]">+{formatCurrency(row.monthlyEarn)}</div>
                  <div className="text-right text-[#f0ebe0]">{formatCurrency(row.cumulative)}</div>
                  <div className="text-right text-[#f0ebe0]">{formatLakhs(row.balance)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="request-note">
        <div className="mx-auto grid max-w-[1600px] gap-16 px-6 py-16 sm:px-10 lg:grid-cols-[1fr_1fr] lg:px-14 lg:py-20">
          <div className="lg:pr-10">
            <div className="mb-6 text-xs uppercase tracking-[0.35em] text-[#c79a36]">Private Access</div>
            <h2
              className={`${editorialSerif.className} text-[clamp(2.6rem,5vw,5rem)] leading-[0.95] tracking-[-0.04em] text-[#f6f1e8]`}
            >
              Invest at the
              <br />
              <span className="italic text-[#d0a441]">foundation.</span>
            </h2>
            <p className="mt-10 max-w-2xl text-lg leading-9 text-[#9a9488]">
              Leave your email and we&apos;ll share the current investor note and a sample term sheet for private review.
              No obligation.
            </p>

            <form onSubmit={handleSubmit} className="mt-12 max-w-3xl space-y-5">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border border-white/10 bg-[#151514] px-6 py-5 text-lg text-[#f0ebe0] outline-none transition placeholder:text-[#6f6a61] focus:border-[#c79a36]"
              />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name (optional)"
                className="w-full border border-white/10 bg-[#151514] px-6 py-5 text-lg text-[#f0ebe0] outline-none transition placeholder:text-[#6f6a61] focus:border-[#c79a36]"
              />
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#c79a36] px-6 py-5 text-sm uppercase tracking-[0.3em] text-[#171410] transition hover:bg-[#d7ad58] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? 'Submitting...' : 'Send Me The Investor Note'}
              </button>
              {status.type !== 'idle' && (
                <p className={`text-sm ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{status.message}</p>
              )}
            </form>

            <div className="mt-12 border-t border-white/10 pt-8 text-sm leading-8 text-[#6f6a61]">
              For informational purposes only. Not a public offer or solicitation to invest. All figures shown are illustrative,
              subject to final diligence, allocation, legal documentation, market conditions, and credit risk.
            </div>
          </div>

          <div className="border-l-0 border-white/10 pt-2 lg:border-l lg:pl-12">
            <div className="mb-6 text-xs uppercase tracking-[0.35em] text-[#c79a36]">Access Summary</div>
            <div className="border border-white/10">
              {[
                ['Window', 'Private investor access'],
                ['Options', 'Pool Participation • Fixed Income'],
                ['Pool Participation ROI', '21 - 24% illustrative'],
                ['Fixed Income ROI', '14% p.a.'],
                ['Pool Economics', '12% hurdle • 2% mgmt • 20% carry'],
                ['Rotation', 'Short-duration deployment cycles'],
                ['Ticket Size', '₹50k - ₹1L'],
                ['Use Case', 'Procurement and working-capital enablement'],
                ['Format', 'Investor note and discussion'],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] gap-6 border-b border-white/10 px-6 py-5 last:border-b-0">
                  <div className="font-mono text-sm text-[#858073]">{label}</div>
                  <div
                    className={`text-right font-mono ${
                      label.includes('ROI') ? 'text-[#d2aa4d]' : 'text-[#f0ebe0]'
                    }`}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
