'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/src/context/StoreContext';
import CanvasShell from '@/src/components/canvas/CanvasShell';

function CanvasInner() {
  const { activeStore, generatedStore } = useStore();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const store = generatedStore || activeStore;

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <CanvasShell store={store} from={from} />;
}

export default function CanvasPage() {
  return (
    <Suspense>
      <CanvasInner />
    </Suspense>
  );
}
