'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, MousePointerClick, Undo2, Redo2, History, Monitor, Tablet, Smartphone, Eye, Rocket, Layout, Sparkles } from 'lucide-react';
import { useStore } from '@/src/context/StoreContext';
import EditorShell from '@/src/components/editor/EditorShell';
import { use } from 'react';

interface Props {
  params: Promise<{ storeId: string }>;
}

// Mirrors EditorShell's top bar + sidebar layout so the chrome appears
// instantly (same position/shape) while the store is still loading, instead
// of a bare centered spinner that makes the whole header "pop in" once data
// arrives — only the dynamic bits (name, undo/redo state, autosave status)
// are missing until the real EditorShell mounts.
function EditorLoadingSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 h-12 flex items-center gap-3 flex-shrink-0 z-10" style={{ isolation: 'isolate', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ArrowLeft className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
          <div className="h-5 w-px bg-slate-200 flex-shrink-0 ml-1" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 text-sm font-medium">
            <MousePointerClick className="w-3.5 h-3.5" /><span className="hidden sm:inline">Edit</span>
          </div>
          <div className="flex items-center gap-0.5 ml-1">
            {[Undo2, Redo2, History].map((Icon, i) => (
              <div key={i} className="p-1.5"><Icon className="w-3.5 h-3.5 text-slate-300" /></div>
            ))}
          </div>
        </div>
        <div className="flex items-center flex-shrink-0">
          <div className="flex items-center bg-slate-100 rounded-xl h-8 px-[3px] gap-0.5">
            {[Monitor, Tablet, Smartphone].map((Icon, i) => (
              <div key={i} className="p-1.5"><Icon className="w-3.5 h-3.5 text-slate-300" /></div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-1 justify-end">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 text-slate-300 text-sm font-medium">
            <Eye className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline">Preview</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 text-slate-300 text-sm font-medium rounded-xl">
            <Rocket className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline">Publish</span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex-shrink-0 bg-white flex flex-col overflow-hidden" style={{ width: 280, isolation: 'isolate', boxShadow: '1px 0 2px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)' }}>
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {[{ label: 'Sections', Icon: Layout }, { label: 'Properties', Icon: Sparkles }].map(({ label, Icon }) => (
              <div key={label} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-300">
                <Icon className="w-3.5 h-3.5" />{label}
              </div>
            ))}
          </div>
        </aside>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  );
}

function EditorInner({ storeId }: { storeId: string }) {
  const { stores, activeStore, generatedStore } = useStore();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  // Prevent accessing localStorage during SSR to avoid hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Always wait for mount so server and client render the same initial HTML
  // (the skeleton is fully static, so it's safe to render identically on both).
  if (!mounted) {
    return <EditorLoadingSkeleton />;
  }

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
    return <EditorLoadingSkeleton />;
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
