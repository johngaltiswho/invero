import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';

export default function InvestorAccessPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="bg-neutral-light rounded-2xl p-8 sm:p-12 text-center border border-neutral-medium">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            Investor Portal
          </h1>
          <p className="text-secondary mb-8 max-w-xl mx-auto">
            Access live project funding, capital returns, and portfolio performance from your Finverno dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/investor">
              <Button className="px-8">Go to Dashboard</Button>
            </Link>
          </div>
          <p className="text-xs text-secondary mt-6">
            If you don’t have access yet, please contact the administrator.
          </p>
        </div>
      </div>
    </Layout>
  );
}
