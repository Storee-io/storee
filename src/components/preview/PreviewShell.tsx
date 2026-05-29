'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Globe, Rocket, LayoutDashboard, ArrowLeft, RefreshCw, X, Sparkles, CloudOff, RotateCcw, PenLine } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import StorePreview from './StorePreview';
import PublishModal from './PublishModal';
import UnpublishModal from './UnpublishModal';
import { generateStoreWithClaude } from '../../lib/claudeApiClient';
import { getGuestId } from '../../lib/guestId';
import GeneratingOverlay from '../GeneratingOverlay';
import type { Store } from '../../context/StoreContext';
import PromptBox, { PROMPT_CURRENCIES } from '../shared/PromptBox';
import type { PromptBoxValue } from '../shared/PromptBox';

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
  const [regenBoxValue, setRegenBoxValue] = useState<PromptBoxValue | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);
  const stepTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastScrollY = useRef(0);
  const scrollStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentY = e.currentTarget.scrollTop;
    const isScrollingDown = currentY > lastScrollY.current;
    lastScrollY.current = currentY;
    setFabHidden(isScrollingDown);

    // Reappear after scroll stops
    if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    scrollStopTimer.current = setTimeout(() => setFabHidden(false), 300);
  }, []);

  useEffect(() => () => {
    if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
  }, []);

  const { updateActiveStore, addStore, stores, setActiveStore, setGeneratedStore, setGenerationState, activeStore } = useStore();
  const router = useRouter();

  // Use activeStore from context when it matches — stays reactive after publish/unpublish
  const liveStore = activeStore?.id === store.id ? activeStore : store;

  const backLabel = getBackLabel(from);
  const backHref = from ?? '/';

  // Derived publish state
  const isPublished    = liveStore.status === 'Published';
  const hasPublishedBefore = !!liveStore.publishedDomain;

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
    // Pre-fill PromptBox from current store values
    setRegenBoxValue({
      brandName: liveStore.name ?? '',
      prompt: liveStore.prompt ?? '',
      color1: liveStore.advancedOptions?.themeColors?.primary || liveStore.primaryColor || '',
      color2: liveStore.advancedOptions?.themeColors?.secondary || '',
      colorMode: 'single',
      colorPicked: !!(liveStore.advancedOptions?.themeColors?.primary || liveStore.primaryColor),
      selectedLang: liveStore.language ?? 'English',
      selectedCurr: liveStore.currency ?? PROMPT_CURRENCIES[0],
      advanced: liveStore.advancedOptions ?? {
        themeColors: { primary: '', secondary: '', accent: '', background: '', surface: '', textPrimary: '', textSecondary: '', border: '', success: '', danger: '' },
        mood: '', audience: '', productCount: '',
        features: { reviews: false, wishlist: true, newsletter: false, promoBar: false, faq: false, testimonials: false, brandStory: false, trustBadges: false },
      },
      advancedApplied: !!liveStore.advancedOptions,
    });
    setShowRegenModal(true);
  };

  const handleRegenerate = async (mode: 'new' | 'replace') => {
    const val = regenBoxValue;
    if (!val || (!val.prompt.trim() && !val.brandName.trim()) || isRegenerating) return;
    setShowRegenModal(false);
    setIsRegenerating(true);

    // Prevent screen from sleeping on mobile during regeneration
    let wakeLock: WakeLockSentinel | null = null;
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      }
    } catch { /* not supported — continue */ }

    const regenBrandName = val.brandName;
    const regenPrompt = val.prompt;
    const regenLanguage = val.selectedLang;
    const regenCurrency = val.selectedCurr ?? PROMPT_CURRENCIES[0];

    // Build advanced options — always include if user picked a color OR toggled advanced
    const hasColor = val.colorPicked && !!val.color1;
    const regenAdvanced = (val.advancedApplied || hasColor) ? {
      ...val.advanced,
      themeColors: {
        ...val.advanced.themeColors,
        ...(hasColor ? {
          primary: val.color1,
          ...(val.colorMode === 'gradient' && val.color2 ? { secondary: val.color2 } : {}),
        } : {}),
      },
    } : null;

    // Drive the GeneratingOverlay step by step
    setGenerationState({ active: true, step: 0, prompt: regenBrandName || regenPrompt });
    stepTimerRefs.current.forEach(clearTimeout);
    stepTimerRefs.current = STEP_TIMINGS.map((delay, i) =>
      setTimeout(() => setGenerationState({ active: true, step: i + 1, prompt: regenBrandName || regenPrompt }), delay)
    );

    // Build enriched prompt: combine brand name + description
    const fullPrompt = [
      regenBrandName.trim() && `Brand name: ${regenBrandName.trim()}`,
      regenPrompt.trim(),
    ].filter(Boolean).join('. ');

    const [aiResult] = await Promise.all([
      generateStoreWithClaude(
        fullPrompt,
        regenCurrency,
        regenLanguage || undefined,
        regenAdvanced ?? undefined,
        liveStore.usedVariationIds,
      ),
      new Promise<void>(r => setTimeout(r, 21000)),
    ]);

    await new Promise<void>(r => setTimeout(r, 600));
    setGenerationState(null);

    // ── Resolve final values (mirrors HeroSection logic) ──────────────────
    const finalName = regenBrandName.trim() || aiResult?.storeName || liveStore.name;

    // Respect user's color pick first, then advanced themeColors, then AI color
    const finalPrimaryColor =
      (regenAdvanced?.themeColors?.primary)  ? regenAdvanced.themeColors.primary
      : hasColor                              ? val.color1
      : aiResult?.primaryColor               ?? liveStore.primaryColor;

    // Gradient: apply color2 as accentColor on design (same as HeroSection)
    const designWithOverride = aiResult?.design
      ? {
          design: {
            ...aiResult.design,
            ...(val.colorPicked && val.colorMode === 'gradient' && val.color2
              ? { accentColor: val.color2 }
              : {}),
          },
        }
      : {};

    // Build updated usedVariationIds — append new ID, deduplicate, preserve order
    const newVariationId = (aiResult as { variationId?: number } | null)?.variationId;
    const updatedUsedIds = newVariationId != null
      ? [...new Set([...(liveStore.usedVariationIds ?? []), newVariationId])]
      : liveStore.usedVariationIds;

    if (mode === 'replace') {
      // ── Replace mode: overwrite current store in-place ──
      const patch: Partial<Store> = {
        name: finalName,
        domain: `${finalName.toLowerCase().replace(/\s+/g, '-')}.storee.io`,
        primaryColor: finalPrimaryColor,
        template: aiResult?.template ?? liveStore.template,
        category: aiResult?.design?.collections?.[0]?.name ?? liveStore.category,
        prompt: regenPrompt,
        ...(regenLanguage ? { language: regenLanguage } : {}),
        currency: regenCurrency,
        ...(regenAdvanced ? { advancedOptions: regenAdvanced } : {}),
        ...designWithOverride,
        ...(updatedUsedIds != null ? { usedVariationIds: updatedUsedIds } : {}),
      };
      const updatedStore = { ...liveStore, ...patch };
      // Persist to localStorage
      localStorage.setItem(`storee_store_${liveStore.id}`, JSON.stringify(updatedStore));
      // Update context — preview page reads generatedStore when IDs match
      setGeneratedStore(updatedStore);
      updateActiveStore(patch);
      wakeLock?.release().catch(() => {});
      setIsRegenerating(false);
      return;
    }

    // ── New store mode: create a brand-new store ──
    const newStore: Store = {
      id: `${finalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
      name: finalName,
      domain: `${finalName.toLowerCase().replace(/\s+/g, '-')}.storee.io`,
      status: 'Draft',
      template: aiResult?.template ?? liveStore.template,
      primaryColor: finalPrimaryColor,
      createdAt: new Date().toISOString(),
      category: aiResult?.design?.collections?.[0]?.name ?? liveStore.category,
      revenue: 0,
      orders: 0,
      ...designWithOverride,
      currency: regenCurrency,
      ...(regenLanguage ? { language: regenLanguage } : {}),
      prompt: regenPrompt,
      ...(regenAdvanced ? { advancedOptions: regenAdvanced } : {}),
      // New store inherits the parent's usedVariationIds so "New Store" regenerates
      // also avoid repeating variations from the same session.
      ...(updatedUsedIds != null ? { usedVariationIds: updatedUsedIds } : {}),
    };

    localStorage.setItem(`storee_store_${newStore.id}`, JSON.stringify(newStore));
    setGeneratedStore(newStore);

    const guestId = getGuestId();
    fetch('/api/save-draft-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId, store: newStore }),
    }).catch(() => {});

    wakeLock?.release().catch(() => {});
    setIsRegenerating(false);
    router.push(`/preview/${newStore.id}?from=${encodeURIComponent(from ?? '/')}`);
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm z-10">
        {/* Left — back + store name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push(backHref)}
            title={backLabel}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{backLabel}</span>
          </button>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">{store.name}</span>
          {isPublished
            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">LIVE</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">DRAFT</span>
          }
        </div>

        {/* Center — device switcher (truly centered) */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 flex-shrink-0">
          {([
            { mode: 'desktop', Icon: Monitor,    label: 'Desktop' },
            { mode: 'tablet',  Icon: Tablet,     label: 'Tablet' },
            { mode: 'mobile',  Icon: Smartphone, label: 'Mobile' },
          ] as const).map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => setDevice(mode)}
              title={label}
              className={`p-2 rounded-lg transition-all ${
                device === mode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Right — icon-only action buttons */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {/* Regenerate */}
          <button
            onClick={openRegenModal}
            disabled={isRegenerating}
            title="Regenerate"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          </button>

          {/* Dashboard */}
          <button
            onClick={handleDashboardClick}
            title="Dashboard"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>

          {/* Publish / Republish / Unpublish — keeps label as primary CTA */}
          {isPublished ? (
            <button
              onClick={() => setShowUnpublishModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold rounded-xl hover:bg-red-100 transition-all"
            >
              <CloudOff className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Unpublish</span>
            </button>
          ) : hasPublishedBefore ? (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-3 sm:px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Republish</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-3 sm:px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              <Rocket className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          )}
        </div>
      </div>

      {/* Store frame */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-auto px-4 sm:px-8 pt-4 sm:pt-8 pb-16 flex justify-center items-start">
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
                <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isPublished ? 'text-slate-400' : 'text-slate-300'}`} />
                <span className={`text-xs font-mono truncate ${isPublished ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isPublished
                    ? `https://${liveStore.publishedDomain ?? liveStore.domain}`
                    : 'https://****.storee.io'}
                </span>
                {isPublished ? (
                  /* Live — green dot */
                  <div className="ml-auto w-3.5 h-3.5 rounded-full bg-green-500/20 flex-shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </div>
                ) : (
                  /* Draft — amber dot + label */
                  <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-[10px] font-medium text-amber-500">Draft</span>
                  </div>
                )}
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
            <StorePreview store={liveStore} device={device} />
          </div>

        </motion.div>
      </div>

      {/* Floating Edit FAB — slides down out when scrolling down, back up when scrolling up */}
      <div
        className="fixed bottom-8 right-8 z-30 transition-transform duration-150 ease-in-out"
        style={{
          transform: fabHidden ? 'translateY(calc(100% + 2rem))' : 'translateY(0)',
        }}
      >
        <button
          onClick={() => router.push(`/canvas/${liveStore.id}?from=${encodeURIComponent(`/preview/${liveStore.id}`)}`)}
          className="group flex items-center gap-2 pl-3 pr-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200"
        >
          <span className="w-7 h-7 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
            <PenLine className="w-3.5 h-3.5 text-white" />
          </span>
          Edit
        </button>
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
              className="w-full sm:w-[560px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-50 p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Regenerate</h2>
                </div>
                <button
                  onClick={() => setShowRegenModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Prompt Box — same capsule UI as Home */}
              {regenBoxValue && (
                <PromptBox
                  compact
                  initial={regenBoxValue}
                  onChange={setRegenBoxValue}
                  placeholder="Describe your store, products, and vibe..."
                />
              )}

              {/* Option description */}
              <p className="text-[11px] text-slate-400 mt-4 mb-3">
                Choose <span className="font-semibold text-emerald-600">New Store</span> to keep this store and generate a separate one, or <span className="font-semibold text-amber-600">Replace</span> to overwrite this store's design.
              </p>

              {/* 2 CTAs */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRegenerate('new')}
                  disabled={!regenBoxValue?.prompt.trim() && !regenBoxValue?.brandName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white gradient-bg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">New Store</span>
                </button>
                <button
                  onClick={() => handleRegenerate('replace')}
                  disabled={!regenBoxValue?.prompt.trim() && !regenBoxValue?.brandName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-amber-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">Replace</span>
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
            store={liveStore}
            onPublish={handlePublishComplete}
            onClose={() => setShowPublishModal(false)}
            {...(hasPublishedBefore && !isPublished
              ? { fixedSubdomain: liveStore.publishedDomain }
              : {})}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnpublishModal && (
          <UnpublishModal
            store={liveStore}
            onConfirm={handleUnpublish}
            onClose={() => setShowUnpublishModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
