'use client';

import { Suspense, useState, useEffect } from 'react';
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
  // Prevent accessing localStorage during SSR to avoid hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Try to find the store by ID — never silently fall back to a different store.
  // Priority: context stores (full Supabase) → generatedStore → localStorage → activeStore with design.
  // Do NOT use activeStore if it has no design — it may be the slim cookie store (SSR seed)
  // which would render the editor with empty sections until the full store arrives.
  const store = (() => {
    // Full store from Supabase (most authoritative)
    const fromStores = stores.find(s => s.id === storeId);
    if (fromStores) return fromStores;
    // New store from generation flow
    if (generatedStore?.id === storeId) return generatedStore;
    // Only access localStorage after mount — keeps server/client render in sync.
    if (mounted) {
      try {
        const raw = localStorage.getItem(`storee_store_${storeId}`);
        if (raw) return JSON.parse(raw);
      } catch { /* ignore */ }
    }
    // activeStore from context — only if it has design (not the slim cookie store)
    if (activeStore?.id === storeId && activeStore.design) return activeStore;
    return null;
  })();

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
