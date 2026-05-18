'use client';

import StorePreview from '@/src/components/preview/StorePreview';
import type { Store } from '@/src/context/StoreContext';

export default function StorefrontClient({ store }: { store: Store }) {
  return (
    <div className="min-h-screen">
      <StorePreview store={store} device="desktop" />
    </div>
  );
}
