import type { Metadata } from 'next';
import Promotions from '@/src/components/dashboard/pages/Promotions';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PromotionsPage() {
  return <Promotions />;
}
