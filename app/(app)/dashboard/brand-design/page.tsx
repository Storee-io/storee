import type { Metadata } from 'next';
import { Suspense } from 'react';
import Appearance from '@/src/components/dashboard/pages/Appearance';
import Branding from '@/src/components/dashboard/pages/Branding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BrandDesignPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<div>Loading...</div>}>
        <Branding />
      </Suspense>
      <Suspense fallback={<div>Loading...</div>}>
        <Appearance />
      </Suspense>
    </div>
  );
}
