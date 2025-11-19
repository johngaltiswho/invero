import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const adminCheck = await isAdmin();
  
  if (!adminCheck) {
    redirect('/sign-in?redirectUrl=/admin');
  }

  return <AdminDashboard />;
}