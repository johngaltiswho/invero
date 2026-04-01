import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function InvestorAccessPage() {
  return (
    <Layout>
      <div className="public-page min-h-screen">
        <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="public-panel rounded-2xl p-8 sm:p-12 text-center">
          <div className="public-kicker mb-4">Investor Access</div>
          <h1 className="font-public-display text-4xl sm:text-5xl text-primary mb-4">
            Investor Portal
          </h1>
          <p className="public-body mb-8 max-w-xl mx-auto">
            Access live project funding, capital returns, and portfolio performance from your Finverno dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/investor">
              <Button className="public-button px-8 hover:bg-[#d7ad58]">Go to Dashboard</Button>
            </Link>
          </div>
          <p className="mt-6 text-xs public-body">
            If you don’t have access yet, please contact the administrator.
          </p>
        </div>
        </div>
      </div>
    </Layout>
  );
}
