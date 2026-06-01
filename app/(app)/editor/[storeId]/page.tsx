'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/src/context/StoreContext';
import EditorShell from '@/src/components/editor/EditorShell';
import { use } from 'react';

interface Props {
  params: Promise<{ storeId: string }>;
}

function EditorInner({ storeId }: { storeId: string }) {
  const { stores, activeStore, generatedStore } = useStore();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

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

  return <EditorShell store={store} from={from} />;
}

export default function EditorPage({ params }: Props) {
  const { storeId } = use(params);
  return (
    <Suspense>
      <EditorInner storeId={storeId} />
    </Suspense>
  );
}
