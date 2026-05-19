import type { Metadata } from 'next';
import Products from '@/src/components/dashboard/pages/Products';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ProductsPage() {
  return <Products />;
}
