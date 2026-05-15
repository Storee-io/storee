import type { Metadata } from 'next';
import StoreSettings from '@/src/components/dashboard/pages/StoreSettings';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StoreSettingsPage() {
  return <StoreSettings />;
}
