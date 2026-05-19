'use client';

import { useState, useEffect } from 'react';
import StorePreview from '@/src/components/preview/StorePreview';
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

export default function StorefrontClient({ store }: { store: Store }) {
  const device = useDeviceMode();

  return (
    <div className="min-h-screen">
      <StorePreview store={store} device={device} />
    </div>
  );
}
