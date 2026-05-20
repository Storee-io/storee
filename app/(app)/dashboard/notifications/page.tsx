import type { Metadata } from 'next';
import NotificationsPage from '@/src/components/dashboard/pages/Notifications';

export const metadata: Metadata = { title: 'Notifications', robots: { index: false, follow: false } };

export default function Page() {
  return <NotificationsPage />;
}
