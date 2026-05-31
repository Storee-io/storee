import type { Metadata } from 'next';
import Analytics from '@/src/components/dashboard/pages/Analytics';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AnalyticsPage() {
  return <Analytics />;
}
