import type { Metadata } from 'next';
import ShippingSettings from '@/src/components/dashboard/pages/ShippingSettings';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ShippingPage() {
  return <ShippingSettings />;
}
