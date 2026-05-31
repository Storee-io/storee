import type { Metadata } from 'next';
import Orders from '@/src/components/dashboard/pages/Orders';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OrdersPage() {
  return <Orders />;
}
