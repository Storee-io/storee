import type { Metadata } from 'next';
import Branding from '@/src/components/dashboard/pages/Branding';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BrandingPage() {
  return <Branding />;
}
