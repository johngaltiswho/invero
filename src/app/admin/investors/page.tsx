import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import InvestorManagement from '@/components/admin/InvestorManagement';

export const dynamic = 'force-dynamic';

export default async function AdminInvestorsPage() {
  const adminCheck = await isAdmin();
  
  if (!adminCheck) {
    redirect('/sign-in?redirectUrl=/admin/investors');
  }

  return <InvestorManagement />;
}