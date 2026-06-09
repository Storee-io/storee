'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StorePreview from '@/src/components/preview/StorePreview';
import { CartProvider } from '@/src/context/CartContext';
import { WishlistProvider } from '@/src/context/WishlistContext';
import type { Store } from '@/src/context/StoreContext';
import type { DeviceMode } from '@/src/components/preview/StorePreview';

function useDeviceMode(): DeviceMode {
  const [device, setDevice] = useState<DeviceMode>('desktop');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setDevice(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return device;
}

export default function StorefrontClient({
  store,
  initialPath = '/',
}: {
  store: Store;
  initialPath?: string;
}) {
  const device = useDeviceMode();
  const router = useRouter();

  // Use Next.js router.push for real page transitions (SSR per page)
  const handlePageChange = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  return (
    <CartProvider>
      <WishlistProvider>
        <div className="min-h-screen">
          <StorePreview
            store={store}
            device={device}
            onPageChange={handlePageChange}
            initialPath={initialPath}
          />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}
