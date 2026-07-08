'use client';

import { useState, useLayoutEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Monitor, Tablet, Smartphone, PencilLine, Rocket, LayoutDashboard, RefreshCw } from 'lucide-react';
import { useStore } from '@/src/context/StoreContext';
import PreviewShell from '@/src/components/preview/PreviewShell';
import type { Store } from '@/src/context/StoreContext';

// Mirrors PreviewShell's toolbar layout so the header appears instantly (same
// position/shape) while the store is still loading, instead of a bare spinner
// that makes the whole header look like it "pops in" once data arrives.
//
// Back, Editor, and Dashboard don't need the full store object — just the id,
// which is already in the URL — so they're real, clickable buttons here, not
// greyed-out placeholders. `name`/`isPublished` come from the slim
// SSR-cookie-seeded activeStore when available (see StoreContext's
// storee_active_store cookie), so the real name and Draft/Live badge show
// immediately instead of a pulse. Regenerate needs the full store (prompt,
// colors, etc.) to pre-fill its modal, so it's disabled — but styled with the
// same disabled:opacity-40 treatment the real button already uses (not the
// heavier grey-placeholder style), since the button itself isn't unknown,
// just momentarily unusable. Publish (needs the full store to open its
// modal) and the name (when truly unknown, e.g. a cold/shared link) are the
// only genuine placeholders left.
function PreviewLoadingSkeleton({ id, from, name, isPublished }: { id: string; from: string | null; name?: string; isPublished?: boolean }) {
  const router = useRouter();
  const backHref = from ?? '/';
  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden font-sans" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', colorScheme: 'light' }}>
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 h-12 flex items-center gap-3 flex-shrink-0 z-10" style={{ isolation: 'isolate', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          {name
            ? <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">{name}</span>
            : <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />}
          {name && (isPublished
            ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />Live
              </span>
            : <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />Draft
              </span>)}
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" /><span className="hidden sm:inline">Regenerate</span>
          </button>
        </div>
        <div className="flex items-center flex-shrink-0">
          <div className="flex items-center bg-slate-100 rounded-xl h-8 px-[3px] gap-0.5">
            {[Monitor, Tablet, Smartphone].map((Icon, i) => (
              <div key={i} className={`p-1.5 rounded-lg ${i === 0 ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-1 justify-end">
          <button
            onClick={() => router.push(`/editor/${id}?from=${encodeURIComponent(`/preview/${id}`)}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <PencilLine className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline">Editor</span>
          </button>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 text-slate-300 text-sm font-medium rounded-xl">
            <Rocket className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline">Publish</span>
          </div>
          <div className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0" />
          <button
            onClick={() => router.push(`/dashboard?storeId=${id}`)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

export default function PreviewByIdPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const { addStore, setGeneratedStore, generatedStore, stores, setActiveStore, activeStore } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [notFound, setNotFound] = useState(false);

  // activeStore is seeded synchronously from the storee_active_store SSR cookie
  // (see app/(app)/layout.tsx), so it's identical on server and first client
  // render — safe to read directly without a hydration mismatch, unlike `stores`.
  const slimActiveStore = activeStore?.id === params.id ? activeStore : null;

  // Always use store loaded from context/API based on params.id
  // Don't use generatedStore from context as it may be from previous session
  const displayStore = store;

  // useLayoutEffect (not useEffect) so that when the store is already loaded —
  // e.g. navigating in from the dashboard, where `stores` is already populated —
  // it resolves synchronously before the browser paints, skipping the loading
  // skeleton entirely instead of flashing it for one frame while an effect
  // catches up. Initial state must still start at null (not a lazy initializer
  // reading context) so server and client agree on the first render and avoid
  // a hydration mismatch — this only fills in after mount, client-side only.
  useLayoutEffect(() => {
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
      <PreviewLoadingSkeleton
        id={params.id}
        from={from}
        name={slimActiveStore?.name}
        isPublished={slimActiveStore?.status === 'Published'}
      />
    );
  }

  return <PreviewShell store={displayStore} from={from} />;
}
