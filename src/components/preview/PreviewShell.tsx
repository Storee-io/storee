'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Globe, Rocket, LayoutDashboard, ArrowLeft, RefreshCw, X, Sparkles, CloudOff } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import StorePreview from './StorePreview';
import PublishModal from './PublishModal';
import UnpublishModal from './UnpublishModal';
import { generateStoreWithClaude } from '../../lib/claudeApiClient';
import { getGuestId } from '../../lib/guestId';
import GeneratingOverlay from '../GeneratingOverlay';
import type { Store } from '../../context/StoreContext';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const BACK_LABELS: Record<string, string> = {
  '/': 'Home',
  '/templates': 'All Templates',
  '/dashboard': 'Dashboard',
};

function getBackLabel(from: string | null): string {
  if (!from) return 'Back';
  if (from.startsWith('/templates/')) return 'Template Preview';
  return BACK_LABELS[from] ?? 'Back';
}

const STEP_TIMINGS = [4000, 8500, 13500, 17000, 20000];

interface Props {
  store: Store;
  from?: string | null;
}

export default function PreviewShell({ store, from = null }: Props) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState(store.prompt ?? '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const stepTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { updateActiveStore, addStore, stores, setActiveStore, setGeneratedStore, setGenerationState } = useStore();
  const router = useRouter();

  const backLabel = getBackLabel(from);
  const backHref = from ?? '/';

  const handlePublishComplete = (subdomain: string) => {
    updateActiveStore({
      status: 'Published',
      domain: subdomain,
      publishedDomain: subdomain.replace('.storee.io', ''),
    });
  };

  const handleUnpublish = () => {
    updateActiveStore({ status: 'Draft' });
    setShowUnpublishModal(false);
  };

  const handleDashboardClick = async () => {
    const isKnown = stores.some(s => s.id === store.id);
    if (!isKnown) {
      await addStore(store);
    } else {
      setActiveStore(store);
    }
    router.push('/dashboard');
  };

  const openRegenModal = () => {
    setRegenPrompt(store.prompt ?? store.name ?? '');
    setShowRegenModal(true);
  };

  const handleRegenerate = async () => {
    if (!regenPrompt.trim() || isRegenerating) return;
    setShowRegenModal(false);
    setIsRegenerating(true);

    // Drive the GeneratingOverlay step by step
    setGenerationState({ active: true, step: 0, prompt: regenPrompt });
    stepTimerRefs.current.forEach(clearTimeout);
    stepTimerRefs.current = STEP_TIMINGS.map((delay, i) =>
      setTimeout(() => setGenerationState({ active: true, step: i + 1, prompt: regenPrompt }), delay)
    );

    const [aiResult] = await Promise.all([
      generateStoreWithClaude(
        regenPrompt,
        store.currency ?? undefined,
        store.language ?? undefined,
        undefined,                 // advanced options
        store.variationId,         // exclude last variation → force different look
      ),
      new Promise<void>(r => setTimeout(r, 21000)),
    ]);

    await new Promise<void>(r => setTimeout(r, 600));
    setGenerationState(null);

    let storeName: string;
    let primaryColor: string;

    if (aiResult) {
      storeName = aiResult.storeName;
      primaryColor = aiResult.primaryColor;
    } else {
      storeName = store.name;
      primaryColor = store.primaryColor;
    }

    const newStore: Store = {
      id: `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
      name: storeName,
      domain: `${storeName.toLowerCase().replace(/\s+/g, '-')}.storee.io`,
      status: 'Draft',
      template: aiResult?.template ?? store.template,
      primaryColor,
      createdAt: new Date().toISOString(),
      category: aiResult?.design?.collections?.[0]?.name ?? store.category,
      revenue: 0,
      orders: 0,
      ...(aiResult?.design ? { design: aiResult.design } : {}),
      ...(store.currency ? { currency: store.currency } : {}),
      ...(store.language ? { language: store.language } : {}),
      prompt: regenPrompt,
      ...((aiResult as { variationId?: number } | null)?.variationId != null
        ? { variationId: (aiResult as { variationId?: number }).variationId }
        : {}),
    };

    localStorage.setItem(`storee_store_${newStore.id}`, JSON.stringify(newStore));
    setGeneratedStore(newStore);

    const guestId = getGuestId();
    fetch('/api/save-draft-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId, store: newStore }),
    }).catch(() => {});

    setIsRegenerating(false);
    router.push(`/preview/${newStore.id}?from=${encodeURIComponent(from ?? '/')}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{backLabel}</span>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base">{store.name}</span>
        </div>

        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          {([
            { mode: 'desktop', Icon: Monitor },
            { mode: 'tablet', Icon: Tablet },
            { mode: 'mobile', Icon: Smartphone },
          ] as const).map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setDevice(mode)}
              className={`p-2 rounded-lg transition-all ${
                device === mode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Regenerate button */}
          <button
            onClick={openRegenModal}
            disabled={isRegenerating}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Regenerate</span>
          </button>
          <button
            onClick={handleDashboardClick}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />Dashboard
          </button>
          {store.status === 'Published' ? (
            <button
              onClick={() => setShowUnpublishModal(true)}
              className="flex items-center gap-2 px-5 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold rounded-xl hover:bg-red-100 transition-all"
            >
              <CloudOff className="w-4 h-4" />Unpublish
            </button>
          ) : (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-2 px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              <Rocket className="w-4 h-4" />Publish
            </button>
          )}
        </div>
      </div>

      {/* Store frame */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
        <motion.div
          animate={{ width: device === 'desktop' ? '100%' : device === 'tablet' ? '768px' : '375px' }}
          transition={{ duration: 0.3 }}
          className="max-w-full rounded-2xl"
          style={{
            minWidth: device === 'mobile' ? '375px' : undefined,
            boxShadow: '0 16px 48px -4px rgba(0,0,0,0.18), 0 6px 16px -2px rgba(0,0,0,0.10)',
          }}
        >
          {/* Mock browser bar */}
          <div className="bg-[#f0f0f0] rounded-t-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-mono truncate">
                  https://{store.domain || 'my-store.storee.io'}
                </span>
                <div className="ml-auto w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            </div>
          </div>

          {/*
            transform: translateZ(0) creates a new containing block for
            position:fixed descendants — keeps FullscreenLayout's fixed
            header/nav inside the mock browser frame instead of escaping
            to the real viewport.
          */}
          <div className="rounded-b-2xl overflow-hidden" style={{ transform: 'translateZ(0)' }}>
            <StorePreview store={store} device={device} />
          </div>
        </motion.div>
      </div>

      {/* Regenerate Modal */}
      <AnimatePresence>
        {showRegenModal && (
          /* Backdrop — flex centers the modal so it never clips off-screen */
          <motion.div
            key="regen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
            onClick={() => setShowRegenModal(false)}
          >
            {/* Modal */}
            <motion.div
              key="regen-modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full sm:w-[480px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-50 p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Regenerate Store</h2>
                </div>
                <button
                  onClick={() => setShowRegenModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                Edit your prompt to regenerate a new version of this store. Your current store won&apos;t be changed.
              </p>

              {/* Prompt textarea */}
              <textarea
                value={regenPrompt}
                onChange={e => setRegenPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRegenerate(); }}
                placeholder="Describe your store..."
                rows={4}
                className="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400"
                autoFocus
              />

              <p className="text-xs text-slate-400 mt-1.5 mb-5">
                Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">⌘ Enter</kbd> to regenerate
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRegenModal(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={!regenPrompt.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold text-white gradient-bg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generating overlay — shown during regeneration */}
      <GeneratingOverlay />

      <AnimatePresence>
        {showPublishModal && (
          <PublishModal
            store={store}
            onPublish={handlePublishComplete}
            onClose={() => setShowPublishModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnpublishModal && (
          <UnpublishModal
            store={store}
            onConfirm={handleUnpublish}
            onClose={() => setShowUnpublishModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
