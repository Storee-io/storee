import type { Metadata } from 'next';
import Appearance from '@/src/components/dashboard/pages/Appearance';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppearancePage() {
  return <Appearance />;
}
