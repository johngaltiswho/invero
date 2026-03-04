import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import AdminBulkOrdersDashboard from '@/components/admin/AdminBulkOrdersDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminBulkOrdersPage() {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    redirect('/sign-in?redirectUrl=/admin/bulk-orders');
  }

  return <AdminBulkOrdersDashboard />;
}

