import type { Metadata } from 'next';
import Collections from '@/src/components/dashboard/pages/Collections';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CollectionsPage() {
  return <Collections />;
}
