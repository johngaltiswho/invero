import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import AdminVerificationDashboard from '@/components/AdminVerificationDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminVerificationPage() {
  const adminCheck = await isAdmin();
  
  if (!adminCheck) {
    redirect('/sign-in?redirectUrl=/admin/verification');
  }

  return <AdminVerificationDashboard />;
}