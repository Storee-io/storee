import type { Metadata } from 'next';
import Customers from '@/src/components/dashboard/pages/Customers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CustomersPage() {
  return <Customers />;
}
