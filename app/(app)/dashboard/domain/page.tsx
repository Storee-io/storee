import type { Metadata } from 'next';
import DomainSettings from '@/src/components/dashboard/pages/DomainSettings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DomainPage() {
  return <DomainSettings />;
}
