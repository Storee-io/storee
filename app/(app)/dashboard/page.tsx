import type { Metadata } from 'next';
import Overview from '@/src/components/dashboard/pages/Overview';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OverviewPage() {
  return <Overview />;
}
