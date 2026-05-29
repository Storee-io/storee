'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useStore } from '@/src/context/StoreContext';
import CanvasShell from '@/src/components/canvas/CanvasShell';
import { use } from 'react';

interface Props {
  params: Promise<{ storeId: string }>;
}

export default function CanvasPage({ params }: Props) {
  const { storeId } = use(params);
  const { stores, activeStore, generatedStore } = useStore();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  // Prefer exact match by ID, fall back to generatedStore or activeStore
  const store =
    stores.find(s => s.id === storeId) ||
    (generatedStore?.id === storeId ? generatedStore : null) ||
    (activeStore?.id === storeId ? activeStore : null) ||
    generatedStore ||
    activeStore;

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <CanvasShell store={store} from={from} />;
}
