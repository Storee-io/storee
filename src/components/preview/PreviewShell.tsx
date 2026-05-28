'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Globe, Rocket, LayoutDashboard, ArrowLeft, RefreshCw, X, Sparkles, CloudOff, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import StorePreview from './StorePreview';
import PublishModal from './PublishModal';
import UnpublishModal from './UnpublishModal';
import { generateStoreWithClaude } from '../../lib/claudeApiClient';
import { getGuestId } from '../../lib/guestId';
import GeneratingOverlay from '../GeneratingOverlay';
import type { Store, AdvancedOptions } from '../../context/StoreContext';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const emptyThemeColors = { primary: '', secondary: '', accent: '', background: '', surface: '', textPrimary: '', textSecondary: '', border: '', success: '', danger: '' };
const defaultAdvanced = (): AdvancedOptions => ({
  themeColors: { ...emptyThemeColors },
  mood: '',
  audience: '',
  productCount: '',
  features: {
    reviews: false, wishlist: true, newsletter: false,
    promoBar: false, faq: false, testimonials: false,
    brandStory: false, trustBadges: false,
  },
});

const LANGUAGES = ['English', 'Bahasa Indonesia', 'Español', 'Français', 'Deutsch', '日本語', '한국어', '中文'];
const CURRENCIES = [
  { code: 'USD', symbol: '$',  label: 'US Dollar' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'EUR', symbol: '€',  label: 'Euro' },
  { code: 'GBP', symbol: '£',  label: 'British Pound' },
  { code: 'JPY', symbol: '¥',  label: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit' },
];

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
  const [regenMode, setRegenMode] = useState<'new' | 'replace'>('new');
  const [regenPrompt, setRegenPrompt] = useState(store.prompt ?? '');
  const [regenAdvanced, setRegenAdvanced] = useState<AdvancedOptions | null>(store.advancedOptions ?? null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [regenBrandName, setRegenBrandName] = useState(store.name ?? '');
  const [regenLanguage, setRegenLanguage] = useState(store.language ?? 'English');
  const [regenCurrency, setRegenCurrency] = useState(store.currency ?? CURRENCIES[0]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const stepTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    setRegenPrompt(liveStore.prompt ?? '');
    setRegenBrandName(liveStore.name ?? '');
    setRegenLanguage(liveStore.language ?? 'English');
    setRegenCurrency(liveStore.currency ?? CURRENCIES[0]);
    setRegenAdvanced(liveStore.advancedOptions ?? null);
    setShowAdvanced(false);
    setShowRegenModal(true);
  };

  const handleRegenerate = async (mode: 'new' | 'replace' = regenMode) => {
    if ((!regenPrompt.trim() && !regenBrandName.trim()) || isRegenerating) return;
    setShowRegenModal(false);
    setIsRegenerating(true);

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
        liveStore.variationId,
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

    if (mode === 'replace') {
      // ── Replace mode: overwrite current store in-place ──
      const patch: Partial<Store> = {
        name: storeName,
        domain: `${storeName.toLowerCase().replace(/\s+/g, '-')}.storee.io`,
        primaryColor,
        template: aiResult?.template ?? store.template,
        category: aiResult?.design?.collections?.[0]?.name ?? store.category,
        prompt: regenPrompt,
        ...(regenLanguage ? { language: regenLanguage } : {}),
        currency: regenCurrency,
        ...(regenAdvanced ? { advancedOptions: regenAdvanced } : {}),
        ...((aiResult?.design) ? { design: aiResult.design } : {}),
        ...((aiResult as { variationId?: number } | null)?.variationId != null
          ? { variationId: (aiResult as { variationId?: number }).variationId }
          : {}),
      };
      updateActiveStore(patch);
      const updatedStore = { ...liveStore, ...patch };
      setGeneratedStore(updatedStore);
      localStorage.setItem(`storee_store_${store.id}`, JSON.stringify(updatedStore));
      setIsRegenerating(false);
      return; // stay on same preview page
    }

    // ── New store mode: create a brand-new store ──
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
      currency: regenCurrency,
      ...(regenLanguage ? { language: regenLanguage } : {}),
      prompt: regenPrompt,
      ...(regenAdvanced ? { advancedOptions: regenAdvanced } : {}),
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
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm z-10">
        {/* Left — back + store name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{backLabel}</span>
          </button>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">{store.name}</span>
        </div>

        {/* Center — device switcher */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 flex-shrink-0">
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

        {/* Right — action buttons, always visible */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Regenerate */}
          <button
            onClick={openRegenModal}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 flex-shrink-0 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Regenerate</span>
          </button>

          {/* Dashboard */}
          <button
            onClick={handleDashboardClick}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          {/* Publish / Republish / Unpublish */}
          {isPublished ? (
            <button
              onClick={() => setShowUnpublishModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-5 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold rounded-xl hover:bg-red-100 transition-all"
            >
              <CloudOff className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Unpublish</span>
            </button>
          ) : hasPublishedBefore ? (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Republish</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              <Rocket className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Publish</span>
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
                  https://{liveStore.domain || 'my-store.storee.io'}
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
                  <h2 className="text-base font-bold text-slate-900">Regenerate</h2>
                </div>
                <button
                  onClick={() => setShowRegenModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Brand Name */}
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Brand Name</label>
              <input
                type="text"
                value={regenBrandName}
                onChange={e => setRegenBrandName(e.target.value)}
                placeholder="e.g. Noir Atelier, Black Roast Co."
                className="w-full px-4 py-2.5 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 mb-3"
                autoFocus
              />

              {/* Brand Description */}
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Brand Description</label>
              <textarea
                value={regenPrompt}
                onChange={e => setRegenPrompt(e.target.value)}
                placeholder="Describe your store, products, and vibe..."
                rows={3}
                className="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 mb-3"
              />

              {/* Color Style */}
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Color Style</label>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-slate-200 flex-shrink-0"
                    style={{ background: regenAdvanced?.themeColors?.primary || liveStore.primaryColor }}
                  />
                  <input
                    type="text"
                    value={regenAdvanced?.themeColors?.primary ?? liveStore.primaryColor}
                    onChange={e => setRegenAdvanced(prev => ({
                      ...(prev ?? defaultAdvanced()),
                      themeColors: { ...(prev?.themeColors ?? emptyThemeColors), primary: e.target.value },
                    }))}
                    placeholder="Primary #hex"
                    className="w-full pl-10 pr-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>
                <div className="relative flex-1">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-slate-200 flex-shrink-0"
                    style={{ background: regenAdvanced?.themeColors?.secondary || '#64748b' }}
                  />
                  <input
                    type="text"
                    value={regenAdvanced?.themeColors?.secondary ?? ''}
                    onChange={e => setRegenAdvanced(prev => ({
                      ...(prev ?? defaultAdvanced()),
                      themeColors: { ...(prev?.themeColors ?? emptyThemeColors), secondary: e.target.value },
                    }))}
                    placeholder="Secondary #hex"
                    className="w-full pl-10 pr-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Language & Currency */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Language</label>
                  <select
                    value={regenLanguage}
                    onChange={e => setRegenLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Currency</label>
                  <select
                    value={regenCurrency.code}
                    onChange={e => setRegenCurrency(CURRENCIES.find(c => c.code === e.target.value) ?? CURRENCIES[0])}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advanced options toggle */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-3"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Advanced Options
                {regenAdvanced && (
                  <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">Saved</span>
                )}
              </button>

              {/* Advanced options panel */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3 space-y-4">

                      {/* Mood */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mood</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(['', 'luxury', 'casual', 'energetic', 'professional', 'romantic'] as const).map(m => (
                            <button
                              key={m || 'none'}
                              onClick={() => setRegenAdvanced(prev => ({ ...(prev ?? defaultAdvanced()), mood: m }))}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                (regenAdvanced?.mood ?? '') === m
                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {m === '' ? 'Auto' : m.charAt(0).toUpperCase() + m.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Target Audience */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Target Audience</label>
                        <input
                          type="text"
                          value={regenAdvanced?.audience ?? ''}
                          onChange={e => setRegenAdvanced(prev => ({ ...(prev ?? defaultAdvanced()), audience: e.target.value }))}
                          placeholder="e.g. young adults, busy parents, coffee lovers..."
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-400"
                        />
                      </div>

                      {/* Product Count */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Number of Products</label>
                        <div className="flex gap-1.5">
                          {([['', 'Auto'], ['few', 'Few (4–6)'], ['medium', 'Medium (8–12)'], ['many', 'Many (16+)']] as const).map(([val, label]) => (
                            <button
                              key={val || 'auto'}
                              onClick={() => setRegenAdvanced(prev => ({ ...(prev ?? defaultAdvanced()), productCount: val }))}
                              className={`flex-1 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                                (regenAdvanced?.productCount ?? '') === val
                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reset */}
                      <button
                        onClick={() => setRegenAdvanced(null)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline transition-colors"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Option description */}
              <p className="text-[11px] text-slate-400 mb-3">
                Choose <span className="font-semibold text-emerald-600">New Store</span> to keep this store and generate a separate one, or <span className="font-semibold text-amber-600">Replace</span> to overwrite this store's design.
              </p>

              {/* 2 CTAs */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRegenerate('new')}
                  disabled={!regenPrompt.trim() && !regenBrandName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white gradient-bg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">New Store</span>
                </button>
                <button
                  onClick={() => handleRegenerate('replace')}
                  disabled={!regenPrompt.trim() && !regenBrandName.trim()}
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
