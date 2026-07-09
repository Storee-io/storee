'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StorePreview from '@/src/components/preview/StorePreview';
import { CartProvider } from '@/src/context/CartContext';
import { WishlistProvider } from '@/src/context/WishlistContext';
import type { Store } from '@/src/context/StoreContext';
import type { DeviceMode } from '@/src/components/preview/StorePreview';
import type { ElementStyleOverride } from '@/src/components/editor/ElementOverlay';

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
  const rootRef = useRef<HTMLDivElement>(null);

  // Set favicon from branding if available
  useEffect(() => {
    if (store.branding?.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = store.branding.faviconUrl;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = store.branding.faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [store.branding?.faviconUrl]);

  // Apply elementOverrides styles from visual editor to live store
  useEffect(() => {
    if (!store.design?.elementOverrides || !rootRef.current) return;

    const overrides = store.design.elementOverrides as Record<string, ElementStyleOverride>;
    const container = rootRef.current;

    // For each saved override, find matching elements and apply styles
    Object.entries(overrides).forEach(([selector, styles]) => {
      const [tagName, className] = selector.split('|');

      // Find all matching elements
      const elements = container.querySelectorAll(tagName);
      elements.forEach((el) => {
        // Check if element matches the saved class
        const elClassName = el.getAttribute('class') || '';
        if (className && !elClassName.includes(className)) return;

        // Apply saved styles to element
        const htmlEl = el as HTMLElement;

        if (styles.width) htmlEl.style.width = styles.width;
        if (styles.height) htmlEl.style.height = styles.height;
        if (styles.marginTop) htmlEl.style.marginTop = styles.marginTop;
        if (styles.marginLeft) htmlEl.style.marginLeft = styles.marginLeft;
        if (styles.transform) htmlEl.style.transform = styles.transform;
        if (styles.position) htmlEl.style.position = styles.position;
        if (styles.top) htmlEl.style.top = styles.top;
        if (styles.left) htmlEl.style.left = styles.left;
      });
    });
  }, [store.design?.elementOverrides]);

  // Use Next.js router.push for real page transitions (SSR per page)
  const handlePageChange = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  return (
    <CartProvider>
      <WishlistProvider>
        <div ref={rootRef} className="min-h-screen">
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
