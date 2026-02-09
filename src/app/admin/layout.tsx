import React from 'react';
import AdminNavbar from '@/components/admin/AdminNavbar';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-darkest">
      <AdminNavbar />
      <main>{children}</main>
    </div>
  );
}
