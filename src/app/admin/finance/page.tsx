import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import AdminFinanceDashboard from '@/components/admin/AdminFinanceDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminFinancePage() {
  const adminCheck = await isAdmin();

  if (!adminCheck) {
    redirect('/sign-in?redirectUrl=/admin/finance');
  }

  return <AdminFinanceDashboard />;
}
