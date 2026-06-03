'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Globe, Rocket, ArrowLeft, RefreshCw, X, Sparkles, CloudOff, RotateCcw, Check, ChevronDown, PencilLine } from 'lucide-react';
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
import { toast } from 'sonner';
import { Tip } from '@/components/ui/tip';

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
  const [currentPath, setCurrentPath] = useState('/');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenBoxValue, setRegenBoxValue] = useState<PromptBoxValue | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const stepTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Address bar dropdown ──────────────────────────────────────────────────────
  const navigateRef = useRef<((path: string) => void) | null>(null);
  const [showAddrDropdown, setShowAddrDropdown] = useState(false);
  const addrBarRef = useRef<HTMLButtonElement>(null);
  const addrDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showAddrDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        addrBarRef.current?.contains(e.target as Node) ||
        addrDropdownRef.current?.contains(e.target as Node)
      ) return;
      setShowAddrDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddrDropdown]);

  const handleNavigate = useCallback((path: string) => {
    setCurrentPath(path);
    navigateRef.current?.(path);
    setShowAddrDropdown(false);
  }, []);

  // ── Frame sizing via ResizeObserver ──────────────────────────────────────────
  const canvasRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const compute = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      const ratio =
        device === 'mobile' ? 9 / 16 :
        device === 'tablet' ? 3 / 4 :
        16 / 10; // desktop
      // Height follows canvas area; clamp width if it exceeds available width
      let h = availH;
      let w = h * ratio;
      if (w > availW) { w = availW; h = w / ratio; }
      setFrameSize({ width: Math.round(w), height: Math.round(h) });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  const { updateActiveStore, setGeneratedStore, setGenerationState, activeStore } = useStore();
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
    toast.success('Store is now live! 🎉', { description: `https://${subdomain}` });
  };

  const handleUnpublish = () => {
    updateActiveStore({ status: 'Draft' });
    setShowUnpublishModal(false);
    toast.success('Store unpublished', { description: 'Your store is no longer publicly accessible.' });
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
      toast.success('Store updated!', { description: `${finalName} has been regenerated.` });
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
    toast.success('New store created!', { description: `${finalName} is ready to preview.` });
    router.push(`/preview/${newStore.id}?from=${encodeURIComponent(from ?? '/')}`);
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 h-12 flex items-center gap-3 flex-shrink-0 shadow-sm z-10">
        {/* Left — back + store name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Tip label={backLabel}>
            <button
              onClick={() => router.push(backHref)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Tip>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">{store.name}</span>
          {isPublished
            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">LIVE</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">DRAFT</span>
          }

          {/* Regenerate — secondary action on left side */}
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <Tip label="Regenerate store">
            <button
              onClick={openRegenModal}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          </Tip>
        </div>

        {/* Center — device switcher (truly centered) */}
        <div className="flex items-center bg-slate-100 rounded-xl h-8 px-[3px] gap-0.5 flex-shrink-0">
          {([
            { mode: 'desktop', Icon: Monitor,    label: 'Desktop' },
            { mode: 'tablet',  Icon: Tablet,     label: 'Tablet' },
            { mode: 'mobile',  Icon: Smartphone, label: 'Mobile' },
          ] as const).map(({ mode, Icon, label }) => (
            <Tip key={mode} label={label}>
              <button
                onClick={() => setDevice(mode)}
                className={`p-1.5 rounded-lg transition-all ${
                  device === mode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            </Tip>
          ))}
        </div>

        {/* Right — action buttons (Edit + Publish) */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {/* Edit */}
          <button
            onClick={() => router.push(`/editor/${liveStore.id}?from=${encodeURIComponent(`/preview/${liveStore.id}`)}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <PencilLine className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Publish / Republish / Unpublish — keeps label as primary CTA */}
          {isPublished ? (
            <Tip label="Take store offline">
              <button
                onClick={() => setShowUnpublishModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-xl hover:bg-red-100 transition-all"
              >
                <CloudOff className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Unpublish</span>
              </button>
            </Tip>
          ) : hasPublishedBefore ? (
            <Tip label="Re-publish your store">
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 gradient-bg text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-md"
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Republish</span>
              </button>
            </Tip>
          ) : (
            <Tip label="Make your store live">
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 gradient-bg text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-md"
              >
                <Rocket className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Publish</span>
              </button>
            </Tip>
          )}
        </div>
      </div>

      {/* Store frame — height fills canvas area, width derived from device aspect ratio */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 py-2 sm:py-3">
        {/* Inner measurement div — clientWidth/clientHeight = available space after padding */}
        <div ref={canvasRef} className="w-full h-full flex justify-center items-center">
        <motion.div
          transition={{ duration: 0.3 }}
          className="flex flex-col rounded-2xl flex-shrink-0"
          style={{
            width: frameSize.width || undefined,
            height: frameSize.height || undefined,
            boxShadow: '0 16px 48px -4px rgba(0,0,0,0.18), 0 6px 16px -2px rgba(0,0,0,0.10)',
          }}
        >
          {/* Mock browser bar */}
          <div className="bg-[#f0f0f0] rounded-t-2xl px-3 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              {/* Address bar — click to open page navigator */}
              <div className="relative flex-1 min-w-0">
                <button
                  ref={addrBarRef}
                  onClick={() => setShowAddrDropdown(v => !v)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1 flex items-center gap-2 overflow-hidden hover:border-slate-300 transition-colors text-left"
                >
                  <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isPublished ? 'text-slate-400' : 'text-slate-300'}`} />
                  <span className={`text-xs font-mono truncate min-w-0 flex-1 ${isPublished ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isPublished
                      ? `https://${liveStore.publishedDomain ?? liveStore.domain}${currentPath === '/' ? '' : currentPath}`
                      : `https://****.storee.io${currentPath === '/' ? '' : currentPath}`}
                  </span>
                  <ChevronDown className={`w-3 h-3 flex-shrink-0 text-slate-400 transition-transform ${showAddrDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Page dropdown */}
                <AnimatePresence>
                  {showAddrDropdown && (
                    <motion.div
                      ref={addrDropdownRef}
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                      style={{ minWidth: 220 }}
                    >
                      {[
                        { path: '/',          label: 'Home' },
                        { path: '/cart',      label: 'Cart' },
                        { path: '/checkout',  label: 'Checkout' },
                        { path: '/wishlist',  label: 'Wishlist' },
                        { path: '/my-orders', label: 'My Orders' },
                      ].map(({ path, label }) => (
                        <button
                          key={path}
                          onClick={() => handleNavigate(path)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors group"
                        >
                          <span className="text-xs font-mono text-slate-600 group-hover:text-slate-900 truncate">{path}</span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[10px] text-slate-400 hidden sm:block">{label}</span>
                            {currentPath === path && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/*
            transform:translateZ(0) is on the outer wrapper (not the scroll div).
            This contains position:fixed overlays to the frame without making them
            scroll with the content (fixed inside a scrollable transform = scrolls).
          */}
          <div
            className="rounded-b-2xl overflow-hidden flex-1"
            style={{ transform: 'translateZ(0)', position: 'relative' }}
          >
            {/* Scroll div — no transform; scrolls store content independently */}
            <div
              ref={scrollContainerRef}
              style={{ overflowY: 'auto', height: '100%' }}
            >
              <StorePreview store={liveStore} device={device} previewShell onPageChange={setCurrentPath} navigateRef={navigateRef} />
            </div>
          </div>

        </motion.div>
        </div>{/* /canvasRef inner div */}
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
