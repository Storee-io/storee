'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useStore } from '@/src/context/StoreContext';
import PreviewShell from '@/src/components/preview/PreviewShell';
import type { Store } from '@/src/context/StoreContext';

export default function PreviewByIdPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const { addStore, setGeneratedStore, stores } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = params.id;

    // 1. Check if it's already in context (e.g. dashboard navigation)
    const inContext = stores.find(s => s.id === id);
    if (inContext) {
      setStore(inContext);
      setGeneratedStore(inContext);
      return;
    }

    // 2. Load from localStorage (AI-generated stores)
    const raw = localStorage.getItem(`storee_store_${id}`);
    if (raw) {
      try {
        const loaded = JSON.parse(raw) as Store;
        setStore(loaded);
        addStore(loaded).catch(console.error);
        setGeneratedStore(loaded);
        return;
      } catch {
        // fall through to not-found
      }
    }

    setNotFound(true);
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500">
        <p className="text-lg font-semibold">Store preview not found</p>
        <p className="text-sm">This preview link may have expired or the store was cleared from your browser.</p>
        <a href="/" className="px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
          Generate a new store
        </a>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <PreviewShell store={store} from={from} />;
}
