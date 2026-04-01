import { redirect } from 'next/navigation';

export default function AdminFuelSettingsPage() {
  redirect('/admin/verification?tab=fuel');
}
