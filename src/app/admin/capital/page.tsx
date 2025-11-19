import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import CapitalTransactions from '@/components/admin/CapitalTransactions';

export const dynamic = 'force-dynamic';

export default async function AdminCapitalPage() {
  const adminCheck = await isAdmin();
  
  if (!adminCheck) {
    redirect('/sign-in?redirectUrl=/admin/capital');
  }

  return <CapitalTransactions />;
}