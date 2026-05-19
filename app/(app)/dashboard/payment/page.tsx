import type { Metadata } from 'next';
import PaymentSettings from '@/src/components/dashboard/pages/PaymentSettings';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PaymentPage() {
  return <PaymentSettings />;
}
