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
  const { addStore, setGeneratedStore, generatedStore, stores, setActiveStore } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Always use store loaded from context/API based on params.id
  // Don't use generatedStore from context as it may be from previous session
  const displayStore = store;

  useEffect(() => {
    const id = params.id;

    // 1. Already in context (e.g. dashboard navigation or context loaded)
    const inContext = stores.find(s => s.id === id);
    if (inContext) {
      setStore(inContext);
      setActiveStore(inContext);
      setGeneratedStore(inContext);
      return;
    }

    // 2. For authenticated stores: fetch from API first to get fresh publishedDomain
    //    (critical for republish URL locking)
    fetch('/api/get-store?id=' + encodeURIComponent(id))
      .then(res => {
        if (res.ok) return res.json();
        // Fall through to guest_stores if not found in authenticated stores
        return Promise.reject('not-in-authenticated');
      })
      .then(({ store: loaded }: { store: Store }) => {
        localStorage.setItem(`storee_store_${loaded.id}`, JSON.stringify(loaded));
        setStore(loaded);
        setActiveStore(loaded);
        setGeneratedStore(loaded);
        addStore(loaded).catch(console.error);
      })
      .catch(err => {
        if (err === 'not-in-authenticated') {
          // 3. For unauthenticated stores: try localStorage first
          const raw = localStorage.getItem(`storee_store_${id}`);
          if (raw) {
            try {
              const loaded = JSON.parse(raw) as Store;
              setStore(loaded);
              setActiveStore(loaded);
              setGeneratedStore(loaded);
              addStore(loaded).catch(console.error);
              return;
            } catch { /* fall through */ }
          }

          // 4. Fallback: fetch from Supabase guest_stores
          //    (covers cleared localStorage, different browser, shared link, unauthenticated)
          fetch(`/api/save-draft-store?id=${encodeURIComponent(id)}`)
            .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
            .then(({ store: loaded }: { store: Store }) => {
              localStorage.setItem(`storee_store_${loaded.id}`, JSON.stringify(loaded));
              setStore(loaded);
              setActiveStore(loaded);
              setGeneratedStore(loaded);
              addStore(loaded).catch(console.error);
            })
            .catch(() => setNotFound(true));
        } else {
          setNotFound(true);
        }
      });
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) {
    // Try to find store in localStorage as last resort
    const fallbackStore = params.id ? localStorage.getItem(`storee_store_${params.id}`) : null;

    if (fallbackStore) {
      try {
        const recovered = JSON.parse(fallbackStore) as Store;
        return <PreviewShell store={recovered} from={from} />;
      } catch {
        // Fall through to not found message
      }
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 text-slate-500">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-slate-700">Store preview not found</p>
          <p className="text-sm">This preview link may have expired or the store was cleared.</p>
          <p className="text-xs mt-3">Store ID: <code className="bg-slate-100 px-2 py-1 rounded text-slate-600">{params.id}</code></p>
        </div>
        <div className="flex gap-3">
          <a
            href="/"
            className="px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Generate a new store
          </a>
          <a
            href="/stores"
            className="px-5 py-2.5 bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-300 transition-colors"
          >
            Back to My Stores
          </a>
        </div>
      </div>
    );
  }

  if (!displayStore) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <PreviewShell store={displayStore} from={from} />;
}
