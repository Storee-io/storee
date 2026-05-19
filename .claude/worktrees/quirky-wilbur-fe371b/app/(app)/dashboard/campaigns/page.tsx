import type { Metadata } from 'next';
import Campaigns from '@/src/components/dashboard/pages/Campaigns';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CampaignsPage() {
  return <Campaigns />;
}
