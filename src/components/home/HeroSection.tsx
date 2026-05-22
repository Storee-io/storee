'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Sparkles, ArrowRight, Store as StoreIcon, Palette, Globe, X, Check,
  CheckCircle2, Loader2, ImageIcon, Package, SlidersHorizontal,
} from 'lucide-react';
import type { AdvancedOptions, ThemeColors } from '../../lib/claudeApiClient';
import { businessCategories, templates } from '../../data/templates';
import type { Template } from '../../data/templates';
import type { Store } from '../../context/StoreContext';
import { generateStoreWithClaude } from '../../lib/claudeApiClient';
import { getGuestId } from '../../lib/guestId';

const generatingSteps = [
  { label: 'Analyzing your prompt...', PendingIcon: Sparkles },
  { label: 'Generating store design...', PendingIcon: Palette },
  { label: 'Creating sample products...', PendingIcon: Package },
  { label: 'Generating logo & banner...', PendingIcon: ImageIcon },
  { label: 'Finalizing your store...', PendingIcon: StoreIcon },
];
const STEP_TIMINGS = [4000, 8500, 13500, 17000, 20000];

const languages = ['English', 'Bahasa Indonesia', 'Español', 'Français', 'Deutsch', '日本語', '한국어', '中文'];
const currencies = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit' },
];

// ── Color presets ────────────────────────────────────────────────────────────
const singlePresets = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#0f172a',
];

const gradientPresets: [string, string][] = [
  ['#10b981', '#14b8a6'],
  ['#10b981', '#06b6d4'],
  ['#3b82f6', '#06b6d4'],
  ['#3b82f6', '#8b5cf6'],
  ['#8b5cf6', '#ec4899'],
  ['#ec4899', '#f97316'],
  ['#f97316', '#eab308'],
  ['#f59e0b', '#ef4444'],
  ['#ef4444', '#8b5cf6'],
  ['#06b6d4', '#6366f1'],
  ['#10b981', '#8b5cf6'],
  ['#ec4899', '#06b6d4'],
];

const emptyThemeColors: ThemeColors = {
  primary: '', secondary: '', accent: '', background: '', surface: '',
  textPrimary: '', textSecondary: '', border: '', success: '', danger: '',
};

const defaultAdvanced: AdvancedOptions = {
  themeColors: { ...emptyThemeColors },
  mood: '',
  audience: '',
  productCount: '',
  features: {
    reviews: true, wishlist: true, newsletter: true, promoBar: true,
    faq: true, testimonials: true, brandStory: true, trustBadges: true,
  },
};

const themeColorEntries: { key: keyof ThemeColors; label: string }[] = [
  { key: 'primary',       label: 'Primary' },
  { key: 'secondary',     label: 'Secondary' },
  { key: 'accent',        label: 'Accent' },
  { key: 'background',    label: 'Background' },
  { key: 'surface',       label: 'Surface' },
  { key: 'textPrimary',   label: 'Text Primary' },
  { key: 'textSecondary', label: 'Text Secondary' },
  { key: 'border',        label: 'Border' },
  { key: 'success',       label: 'Success' },
  { key: 'danger',        label: 'Danger' },
];

const moodOptions: { value: AdvancedOptions['mood']; label: string; emoji: string }[] = [
  { value: 'luxury', label: 'Luxury', emoji: '💎' },
  { value: 'casual', label: 'Casual', emoji: '😊' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'romantic', label: 'Romantic', emoji: '🌸' },
];

const productCountOptions: { value: AdvancedOptions['productCount']; label: string; sub: string }[] = [
  { value: 'few', label: 'Few', sub: '~6 items' },
  { value: 'medium', label: 'Standard', sub: '~12 items' },
  { value: 'many', label: 'Many', sub: '~18 items' },
];

const featureList: { key: keyof AdvancedOptions['features']; label: string; emoji: string }[] = [
  { key: 'reviews', label: 'Reviews', emoji: '⭐' },
  { key: 'wishlist', label: 'Wishlist', emoji: '❤️' },
  { key: 'newsletter', label: 'Newsletter', emoji: '📧' },
  { key: 'promoBar', label: 'Promo Bar', emoji: '📢' },
  { key: 'faq', label: 'FAQ', emoji: '❓' },
  { key: 'testimonials', label: 'Testimonials', emoji: '💬' },
  { key: 'brandStory', label: 'Brand Story', emoji: '📖' },
  { key: 'trustBadges', label: 'Trust Badges', emoji: '🛡️' },
];

// Renders children into document.body so they escape any parent stacking context
function PortalPopup({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default function HeroSection() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [brandNameActive, setBrandNameActive] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorMode, setColorMode] = useState<'single' | 'gradient'>('single');
  const [colorPicked, setColorPicked] = useState(false);
  const [color1, setColor1] = useState('#10b981');
  const [color2, setColor2] = useState('#06b6d4');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showCurrDropdown, setShowCurrDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState('');
  const [selectedCurr, setSelectedCurr] = useState<typeof currencies[0] | null>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [, forcePositionUpdate] = useState(0);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedOptions>({
    ...defaultAdvanced,
    themeColors: { ...emptyThemeColors },
    features: { ...defaultAdvanced.features },
  });
  const [advancedApplied, setAdvancedApplied] = useState(false);

  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const currBtnRef = useRef<HTMLButtonElement>(null);
  const advancedBtnRef = useRef<HTMLButtonElement>(null);

  // Compute smart popup position so it stays fully within the viewport.
  // topBarH: height of any fixed top bar to avoid (default 0 for most popups, 64 for advanced panel)
  const getSmartPos = (
    btnRef: React.RefObject<HTMLButtonElement | null>,
    popupW: number,
    popupH: number,
    gap = 12,
    topBarH = 0,
  ): React.CSSProperties => {
    const btn = btnRef.current;
    if (!btn) return { bottom: '100%', left: 0, marginBottom: gap };
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Vertical: prefer above, fall back to below
    const spaceAbove = r.top - gap - topBarH;
    const spaceBelow = vh - r.bottom - gap;
    const showAbove = spaceAbove >= popupH || spaceAbove >= spaceBelow;

    // Horizontal: default align to left edge of button, shift left if overflows
    let left = r.left;
    if (left + popupW > vw - 8) left = Math.max(8, vw - popupW - 8);

    const style: React.CSSProperties = {
      position: 'fixed',
      left,
      width: popupW,
      zIndex: 9999,
    };
    if (showAbove) {
      style.bottom = vh - r.top + gap;
      style.maxHeight = `${spaceAbove}px`;
    } else {
      style.top = r.bottom + gap;
      style.maxHeight = `${spaceBelow}px`;
    }
    return style;
  };

  const closeAllDropdowns = () => {
    setShowColorPicker(false);
    setShowLangDropdown(false);
    setShowCurrDropdown(false);
    setShowAdvancedPanel(false);
  };

  // When a running category capsule is clicked:
  //  1. Fill the prompt
  //  2. Activate Brand Name input so user can immediately name their brand
  const handleCategoryClick = (cat: typeof businessCategories[0]) => {
    setPrompt(cat.prompt);
    setBrandNameActive(true);
    // Small delay so the input renders before focusing
    setTimeout(() => brandInputRef.current?.focus(), 50);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    // Run Claude API call and minimum loading timer in parallel.
    // The timer ensures all 5 steps are shown (last step triggers at 20s),
    // then we wait an extra 600ms so the final ✓ is visible before navigating.
    const [aiResult] = await Promise.all([
      generateStoreWithClaude(prompt, selectedCurr ?? undefined, selectedLang || undefined, advancedApplied ? advanced : undefined),
      new Promise<void>(r => setTimeout(r, 21000)),
    ]);
    // Brief pause so the final "Finalizing your store..." shows as ✓
    await new Promise<void>(r => setTimeout(r, 600));

    let template: Template | undefined;
    let storeName: string;
    let primaryColorFinal: string;

    if (aiResult) {
      template = aiResult.template; // undefined for Option C AI stores
      storeName = brandName || aiResult.storeName;
      primaryColorFinal = (advancedApplied && advanced.themeColors.primary) ? advanced.themeColors.primary
        : colorPicked ? color1 : aiResult.primaryColor;
    } else {
      // Fallback — no API key or call failed, use keyword matching
      const CATEGORY_KEYWORDS: Record<string, string[]> = {
        Fashion:     ['fashion', 'cloth', 'apparel', 'wear', 'outfit', 'dress', 'shirt', 'style', 'boutique'],
        Beauty:      ['beauty', 'skincare', 'cosmetic', 'makeup', 'glow', 'serum', 'lipstick', 'moisturizer'],
        Coffee:      ['coffee', 'cafe', 'brew', 'espresso', 'barista', 'latte', 'cappuccino'],
        Electronics: ['electronic', 'tech', 'gadget', 'device', 'computer', 'phone', 'laptop', 'digital', 'smart'],
        Furniture:   ['furniture', 'home decor', 'interior', 'living', 'sofa', 'table', 'chair', 'decor'],
        Food:        ['food', 'grocery', 'organic', 'meal', 'fruit', 'vegetable', 'restaurant', 'snack'],
        Fitness:     ['fitness', 'gym', 'workout', 'exercise', 'sport equipment', 'health'],
        Books:       ['book', 'novel', 'library', 'literature', 'read', 'publishing'],
        Jewelry:     ['jewelry', 'jewel', 'ring', 'necklace', 'bracelet', 'gem', 'accessory'],
        Toys:        ['toy', 'kids', 'children', 'play', 'game', 'toddler'],
        Sports:      ['sport', 'outdoor', 'athletic', 'football', 'basketball', 'cycling'],
        Art:         ['art', 'paint', 'gallery', 'creative', 'craft', 'illustration'],
      };
      const promptLower = prompt.toLowerCase();
      const categoryMatch = businessCategories.find(c => {
        const keywords = CATEGORY_KEYWORDS[c.label] ?? [c.label.toLowerCase()];
        return keywords.some(kw => promptLower.includes(kw));
      });
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      template = categoryMatch
        ? templates.find(t => t.category.toLowerCase() === categoryMatch.label.toLowerCase()) ?? randomTemplate
        : randomTemplate;
      storeName = brandName || template.name;
      primaryColorFinal = (advancedApplied && advanced.themeColors.primary) ? advanced.themeColors.primary : color1;
    }

    // If user picked a gradient, apply color2 as accentColor override on the design
    const designOverride = aiResult?.design
      ? {
          design: {
            ...aiResult.design,
            ...(colorPicked && colorMode === 'gradient' ? { accentColor: color2 } : {}),
          },
        }
      : {};

    const newStore: Store = {
      id: `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
      name: storeName,
      domain: `${storeName.toLowerCase().replace(/\s+/g, '-')}.storee.io`,
      status: 'Draft',
      template,
      primaryColor: primaryColorFinal,
      createdAt: new Date().toISOString(),
      category: template?.category ?? aiResult?.design?.collections?.[0]?.name ?? 'General',
      revenue: 0,
      orders: 0,
      ...designOverride,
      ...(selectedCurr ? { currency: selectedCurr } : {}),
      ...(selectedLang ? { language: selectedLang } : {}),
    };

    // Save to localStorage (fast, instant access on same browser)
    localStorage.setItem(`storee_store_${newStore.id}`, JSON.stringify(newStore));

    // Fire-and-forget save to Supabase so the store survives localStorage clears
    // and can be fetched on any device/browser via the store ID.
    const guestId = getGuestId();
    fetch('/api/save-draft-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId, store: newStore }),
    }).catch(() => { /* non-critical — localStorage is the primary fallback */ });

    // Navigate immediately — keep overlay visible during transition so home page
    // never flashes. The overlay disappears naturally when HeroSection unmounts.
    router.push(`/preview/${newStore.id}?from=/`);
  };

  // Color Style → Theme Colors: sync primary/secondary when color changes
  useEffect(() => {
    if (!colorPicked) return;
    setAdvanced(prev => {
      const next = {
        ...prev,
        themeColors: {
          ...prev.themeColors,
          primary: color1,
          ...(colorMode === 'gradient' ? { secondary: color2 } : {}),
        },
      };
      // Skip if nothing changed to avoid loop
      if (next.themeColors.primary === prev.themeColors.primary &&
          next.themeColors.secondary === prev.themeColors.secondary) return prev;
      return next;
    });
  }, [colorPicked, color1, color2, colorMode]);

  // Theme Colors → Color Style: sync primary/secondary back to color1/color2
  useEffect(() => {
    const p = advanced.themeColors.primary;
    const s = advanced.themeColors.secondary;
    if (p && /^#[0-9a-fA-F]{6}$/.test(p) && p !== color1) {
      setColor1(p);
      setColorPicked(true);
    }
    if (s && /^#[0-9a-fA-F]{6}$/.test(s) && s !== color2) {
      setColor2(s);
      setColorPicked(true);
      setColorMode('gradient');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanced.themeColors.primary, advanced.themeColors.secondary]);

  // Re-compute popup positions on scroll/resize so popups follow the button
  useEffect(() => {
    const anyOpen = showColorPicker || showLangDropdown || showCurrDropdown || showAdvancedPanel;
    if (!anyOpen) return;
    const handler = () => forcePositionUpdate(n => n + 1);
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [showColorPicker, showLangDropdown, showCurrDropdown, showAdvancedPanel]);

  // Step progression timers
  useEffect(() => {
    if (!isGenerating) { setGeneratingStep(0); return; }
    const timeouts = STEP_TIMINGS.map((delay, i) =>
      setTimeout(() => setGeneratingStep(i + 1), delay)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [isGenerating]);

  const doubled = [...businessCategories, ...businessCategories];

  // Default → subtle shadow + barely-visible border
  // Active (focused or has content) → teal-tinted shadow + clear defined border
  // Shadow menyerupai pencahayaan dari sedikit atas:
  // y-offset positif (bayangan jatuh ke bawah), blur lebar, x-offset 0
  const promptBoxClass = isFocused || prompt.trim()
    ? 'shadow-[0_6px_32px_-4px_rgba(16,185,129,0.22),0_6px_16px_-2px_rgba(16,185,129,0.12)]'
    : 'shadow-[0_6px_28px_-4px_rgba(0,0,0,0.14),0_6px_10px_-2px_rgba(0,0,0,0.08)]';

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center pt-16"
      style={{ background: 'linear-gradient(170deg, #e0fdf4 0%, #f0fdf4 20%, #ecfeff 45%, #f0f9ff 70%, #ffffff 100%)' }}
    >
      {/* Background blobs — overflow-hidden here, NOT on section, so popups aren't clipped */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Tosca blob — top left */}
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 20, 0], scale: [1, 1.07, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-16 -left-20 w-[520px] h-[520px] rounded-full blur-[80px]"
          style={{ background: 'rgba(20,184,166,0.18)' }}
        />
        {/* Hijau muda blob — top center-right */}
        <motion.div
          animate={{ y: [0, 24, 0], x: [0, -16, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 right-[10%] w-[460px] h-[460px] rounded-full blur-[80px]"
          style={{ background: 'rgba(134,239,172,0.22)' }}
        />
        {/* Biru muda blob — center */}
        <motion.div
          animate={{ y: [0, -20, 0], scale: [1, 1.09, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full blur-[90px]"
          style={{ background: 'rgba(125,211,252,0.18)' }}
        />
        {/* Tosca kecil — mid left */}
        <motion.div
          animate={{ y: [0, -18, 0], x: [0, 14, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute top-[40%] -left-8 w-72 h-72 rounded-full blur-[60px]"
          style={{ background: 'rgba(45,212,191,0.16)' }}
        />
        {/* Hijau muda kecil — bottom left */}
        <motion.div
          animate={{ y: [0, -16, 0], x: [0, 22, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-[10%] left-[12%] w-80 h-80 rounded-full blur-[70px]"
          style={{ background: 'rgba(110,231,183,0.18)' }}
        />
        {/* Biru kecil — bottom right */}
        <motion.div
          animate={{ y: [0, 18, 0], x: [0, -14, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
          className="absolute bottom-[8%] right-[8%] w-80 h-80 rounded-full blur-[70px]"
          style={{ background: 'rgba(56,189,248,0.16)' }}
        />
        {/* Fade ke putih di bagian bawah */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 2xl:px-32 text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700 font-medium mb-4 sm:mb-8"
        >
          <Sparkles className="w-4 h-4" />
          AI-Powered Store Builder
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl lg:text-7xl font-bold text-slate-900 leading-tight tracking-tight mb-3 sm:mb-6"
        >
          Build Your Online Store
          <br />
          <span className="gradient-text">With Just a Prompt</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-xl text-slate-500 max-w-2xl mx-auto mb-5 sm:mb-10 leading-relaxed"
        >
          Describe your business and our AI will generate a complete, ready-to-publish online store in seconds. No code, no design skills needed.
        </motion.p>

        {/* ── Running category capsules ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-5 sm:mb-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        >
          <div className="flex animate-scroll w-max gap-2.5">
            {doubled.map((cat, i) => (
              <button
                key={i}
                onClick={() => handleCategoryClick(cat)}
                className="
                  flex items-center gap-2 px-4 py-2
                  bg-white border border-slate-100
                  rounded-full text-sm font-medium text-slate-600
                  shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                  hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50
                  hover:shadow-[0_2px_8px_rgba(16,185,129,0.12)]
                  active:scale-95
                  transition-all duration-200 whitespace-nowrap
                "
              >
                <span className="text-base leading-none">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Prompt Box ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative max-w-3xl mx-auto"
        >
          {/* Outer card — NO overflow-hidden so popups aren't clipped */}
          <div
            className={`bg-white rounded-2xl transition-all duration-300 ${promptBoxClass}`}
            onFocus={() => setIsFocused(true)}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocused(false);
            }}
          >

            {/* ── Option capsules row ─────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 flex-wrap">

              {/* Brand Name */}
              <div className="relative">
                {brandNameActive ? (
                  <div className="flex items-center gap-1.5 h-8 bg-white border border-emerald-400 rounded-full px-3.5">
                    <StoreIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <input
                      ref={brandInputRef}
                      autoFocus
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      placeholder="Brand name..."
                      className="bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none w-28 font-medium"
                    />
                    <button
                      onClick={() => { setBrandNameActive(false); setBrandName(''); }}
                      className="text-emerald-400 hover:text-emerald-600 transition-colors ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setBrandNameActive(true)}
                    className="flex items-center gap-1.5 h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-full text-sm text-slate-600 font-medium transition-all duration-200"
                  >
                    <StoreIcon className="w-3.5 h-3.5 text-emerald-500" />
                    Brand name...
                  </button>
                )}
              </div>

              {/* ── Color Style ─────────────────────────────────────────── */}
              <div className="relative">
                <button
                  ref={colorBtnRef}
                  onClick={() => { setShowColorPicker(!showColorPicker); setShowLangDropdown(false); setShowCurrDropdown(false); }}
                  className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                    showColorPicker
                      ? 'bg-slate-50 border-slate-300 text-slate-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 flex-shrink-0" />
                  {colorPicked && (
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-sm flex-shrink-0"
                      style={{
                        background: colorMode === 'gradient'
                          ? `linear-gradient(135deg, ${color1}, ${color2})`
                          : color1,
                      }}
                    />
                  )}
                </button>

                <PortalPopup>
                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="w-72 bg-white rounded-2xl border border-slate-200/80 p-4"
                      style={{ ...getSmartPos(colorBtnRef, 288, 340), boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
                    >
                      {/* Mode tabs */}
                      <div className="flex gap-1.5 mb-4 bg-slate-100 p-1 rounded-xl">
                        {(['single', 'gradient'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setColorMode(mode)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                              colorMode === mode
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {mode === 'single' ? 'Single Color' : 'Gradient'}
                          </button>
                        ))}
                      </div>

                      {colorMode === 'single' ? (
                        <>
                          {/* Single presets — circles */}
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Presets</p>
                          <div className="grid grid-cols-6 gap-2 mb-4">
                            {singlePresets.map(c => (
                              <button
                                key={c}
                                onClick={() => { setColor1(c); setColorPicked(true); }}
                                className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 ${
                                  color1 === c ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''
                                }`}
                                style={{ background: c }}
                                title={c}
                              />
                            ))}
                          </div>
                          {/* Custom picker */}
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Custom</p>
                          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5">
                            <label className="relative flex-shrink-0 cursor-pointer group">
                              <div
                                className="w-7 h-7 rounded-lg border border-slate-200 transition-all group-hover:scale-105"
                                style={{ background: colorPicked ? color1 : 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)' }}
                              />
                              <input
                                type="color"
                                value={color1}
                                onChange={e => { setColor1(e.target.value); setColorPicked(true); }}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              />
                            </label>
                            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                            <input
                              type="text"
                              value={colorPicked ? color1 : ''}
                              onChange={e => {
                                const v = e.target.value;
                                const hex = v.startsWith('#') ? v : '#' + v;
                                setColor1(hex);
                                if (/^#[0-9a-fA-F]{3,6}$/.test(hex)) setColorPicked(true);
                              }}
                              placeholder="#"
                              maxLength={7}
                              className="flex-1 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none"
                            />
                            {colorPicked && (
                              <button
                                onClick={() => setColorPicked(false)}
                                className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Gradient presets — circles, 6×2 grid */}
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Presets</p>
                          <div className="grid grid-cols-6 gap-2 mb-4">
                            {gradientPresets.map(([c1, c2], i) => (
                              <button
                                key={i}
                                onClick={() => { setColor1(c1); setColor2(c2); setColorPicked(true); }}
                                className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 ${
                                  color1 === c1 && color2 === c2
                                    ? 'ring-2 ring-offset-2 ring-slate-500 scale-110'
                                    : ''
                                }`}
                                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                              />
                            ))}
                          </div>
                          {/* Custom pickers */}
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Custom</p>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Color 1 */}
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5 min-w-0">
                              <label className="relative flex-shrink-0 cursor-pointer group">
                                <div
                                  className="w-7 h-7 rounded-lg border border-slate-200 transition-all group-hover:scale-105"
                                  style={{ background: colorPicked ? color1 : 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)' }}
                                />
                                <input type="color" value={color1} onChange={e => { setColor1(e.target.value); setColorPicked(true); }} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                              </label>
                              <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                              <input
                                type="text"
                                value={colorPicked ? color1 : ''}
                                onChange={e => {
                                  const v = e.target.value;
                                  const hex = v.startsWith('#') ? v : '#' + v;
                                  setColor1(hex);
                                  if (/^#[0-9a-fA-F]{3,6}$/.test(hex)) setColorPicked(true);
                                }}
                                placeholder="#"
                                maxLength={7}
                                className="w-0 flex-1 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none"
                              />
                            </div>
                            {/* Color 2 */}
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5 min-w-0">
                              <label className="relative flex-shrink-0 cursor-pointer group">
                                <div
                                  className="w-7 h-7 rounded-lg border border-slate-200 transition-all group-hover:scale-105"
                                  style={{ background: colorPicked ? color2 : 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)' }}
                                />
                                <input type="color" value={color2} onChange={e => { setColor2(e.target.value); setColorPicked(true); }} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                              </label>
                              <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                              <input
                                type="text"
                                value={colorPicked ? color2 : ''}
                                onChange={e => {
                                  const v = e.target.value;
                                  const hex = v.startsWith('#') ? v : '#' + v;
                                  setColor2(hex);
                                  if (/^#[0-9a-fA-F]{3,6}$/.test(hex)) setColorPicked(true);
                                }}
                                placeholder="#"
                                maxLength={7}
                                className="w-0 flex-1 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none"
                              />
                            </div>
                          </div>
                          {/* Preview bar — only when a color is picked */}
                          <div
                            className={`h-7 rounded-xl mt-3 transition-opacity duration-200 ${colorPicked ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            style={{ background: `linear-gradient(90deg, ${color1}, ${color2})` }}
                          />
                        </>
                      )}

                      <div className="flex gap-2 mt-3">
                        {colorPicked && (
                          <button
                            onClick={() => { setColorPicked(false); setShowColorPicker(false); }}
                            className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          onClick={() => { setColorPicked(true); setShowColorPicker(false); }}
                          className="flex-1 py-2 text-xs font-semibold gradient-bg text-white hover:opacity-90 rounded-xl transition-opacity"
                        >
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </PortalPopup>
              </div>

              {/* ── Site Language ───────────────────────────────────────── */}
              <div className="relative">
                <button
                  ref={langBtnRef}
                  onClick={() => { setShowLangDropdown(!showLangDropdown); setShowColorPicker(false); setShowCurrDropdown(false); }}
                  className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                    showLangDropdown
                      ? 'bg-slate-50 border-slate-300 text-slate-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  {selectedLang && (
                    <span className="whitespace-nowrap">{selectedLang}</span>
                  )}
                </button>

                <PortalPopup>
                <AnimatePresence>
                  {showLangDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="w-52 bg-white rounded-2xl border border-slate-200/80 py-2"
                      style={{ ...getSmartPos(langBtnRef, 208, 280), boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
                    >
                      {languages.map(lang => (
                        <button
                          key={lang}
                          onClick={() => { setSelectedLang(lang); setShowLangDropdown(false); }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <span>{lang}</span>
                          {selectedLang === lang && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                </PortalPopup>
              </div>

              {/* ── Currency ────────────────────────────────────────────── */}
              <div className="relative">
                <button
                  ref={currBtnRef}
                  onClick={() => { setShowCurrDropdown(!showCurrDropdown); setShowColorPicker(false); setShowLangDropdown(false); setShowAdvancedPanel(false); }}
                  className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                    showCurrDropdown
                      ? 'bg-slate-50 border-slate-300 text-slate-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {/* Always shows a symbol — selected currency's or default $ */}
                  <span className="font-semibold text-sm leading-none flex-shrink-0">
                    {selectedCurr ? selectedCurr.symbol : '$'}
                  </span>
                  {selectedCurr && (
                    <span className="whitespace-nowrap">{selectedCurr.code}</span>
                  )}
                </button>

                <PortalPopup>
                <AnimatePresence>
                  {showCurrDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="w-56 bg-white rounded-2xl border border-slate-200/80 py-2"
                      style={{ ...getSmartPos(currBtnRef, 224, 260), boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
                    >
                      {currencies.map(curr => (
                        <button
                          key={curr.code}
                          onClick={() => { setSelectedCurr(curr); setShowCurrDropdown(false); }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="font-bold text-slate-900 w-6 text-center">{curr.symbol}</span>
                            <span>{curr.label}</span>
                          </span>
                          {selectedCurr?.code === curr.code && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                </PortalPopup>
              </div>

              {/* ── Advanced Options ─────────────────────────────────────── */}
              <div className="relative ml-auto">
                <button
                  ref={advancedBtnRef}
                  onClick={() => { setShowAdvancedPanel(!showAdvancedPanel); setShowColorPicker(false); setShowLangDropdown(false); setShowCurrDropdown(false); }}
                  className={`relative flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border ${
                    showAdvancedPanel
                      ? 'bg-slate-50 border-slate-300 text-slate-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                  }`}
                  title="Advanced Options"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
                  {advancedApplied && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                  )}
                </button>

                <PortalPopup>
                <AnimatePresence>
                  {showAdvancedPanel && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="w-96 bg-white rounded-2xl border border-slate-200/80 flex flex-col"
                      style={{ ...getSmartPos(advancedBtnRef, 384, 620, 12, 64), boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)', overflow: 'hidden' }}
                    >
                      {/* Header */}
                      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-800">Advanced Options</p>
                          <p className="text-xs text-slate-400 mt-0.5">Guide the AI with more specific instructions</p>
                        </div>
                        <button
                          onClick={() => setShowAdvancedPanel(false)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-4 space-y-5 overflow-y-auto flex-1">

                        {/* Theme Colors */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Theme Colors</p>
                            <button
                              onClick={() => setAdvanced(prev => ({ ...prev, themeColors: { ...emptyThemeColors } }))}
                              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              Clear all
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {themeColorEntries.map(({ key, label }) => {
                              const val = advanced.themeColors[key];
                              const isSet = val && /^#[0-9a-fA-F]{3,6}$/.test(val);
                              return (
                                <div key={key} className="flex flex-col gap-1">
                                  {/* Label row */}
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-0.5">{label}</p>
                                  {/* Color card — matches the Custom pickers in color picker */}
                                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5 group">
                                    {/* Swatch — opens native color picker */}
                                    <label className="relative flex-shrink-0 cursor-pointer">
                                      <div
                                        className="w-7 h-7 rounded-lg border border-slate-200 flex-shrink-0 transition-all group-hover:scale-105"
                                        style={{
                                          background: isSet ? val : 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)',
                                        }}
                                      />
                                      <input
                                        type="color"
                                        value={isSet ? val : '#ffffff'}
                                        onChange={e => setAdvanced(prev => ({ ...prev, themeColors: { ...prev.themeColors, [key]: e.target.value } }))}
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                      />
                                    </label>
                                    {/* Divider */}
                                    <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                                    {/* Hex input */}
                                    <input
                                      type="text"
                                      value={val}
                                      onChange={e => {
                                        let raw = e.target.value;
                                        if (raw && !raw.startsWith('#')) raw = '#' + raw;
                                        setAdvanced(prev => ({ ...prev, themeColors: { ...prev.themeColors, [key]: raw } }));
                                      }}
                                      placeholder="#"
                                      maxLength={7}
                                      className="flex-1 min-w-0 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none"
                                    />
                                    {/* Clear */}
                                    {val && (
                                      <button
                                        onClick={() => setAdvanced(prev => ({ ...prev, themeColors: { ...prev.themeColors, [key]: '' } }))}
                                        className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Store Mood */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Store Mood</p>
                          <div className="flex flex-wrap gap-1.5">
                            {moodOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setAdvanced(prev => ({ ...prev, mood: prev.mood === opt.value ? '' : opt.value }))}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  advanced.mood === opt.value
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                <span>{opt.emoji}</span>
                                {opt.label}
                                {advanced.mood === opt.value && <Check className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Target Audience */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Target Audience</p>
                          <input
                            type="text"
                            value={advanced.audience}
                            onChange={e => setAdvanced(prev => ({ ...prev, audience: e.target.value }))}
                            placeholder="e.g. young women 18–28, tech enthusiasts, parents..."
                            className="w-full h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                          />
                        </div>

                        {/* Product Count */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Number of Products</p>
                          <div className="flex gap-2">
                            {productCountOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setAdvanced(prev => ({ ...prev, productCount: prev.productCount === opt.value ? '' : opt.value }))}
                                className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl border text-center transition-all ${
                                  advanced.productCount === opt.value
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                <span className="text-xs font-bold">{opt.label}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Features */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Optional Features</p>
                            <button
                              onClick={() => {
                                const allOn = featureList.every(f => advanced.features[f.key]);
                                setAdvanced(prev => ({
                                  ...prev,
                                  features: Object.fromEntries(featureList.map(f => [f.key, !allOn])) as AdvancedOptions['features'],
                                }));
                              }}
                              className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              {featureList.every(f => advanced.features[f.key]) ? 'Deselect all' : 'Select all'}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {featureList.map(f => (
                              <button
                                key={f.key}
                                onClick={() => setAdvanced(prev => ({
                                  ...prev,
                                  features: { ...prev.features, [f.key]: !prev.features[f.key] },
                                }))}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${
                                  advanced.features[f.key]
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                <span className="text-sm leading-none">{f.emoji}</span>
                                <span className="flex-1">{f.label}</span>
                                <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${
                                  advanced.features[f.key] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                }`}>
                                  {advanced.features[f.key] && <Check className="w-2.5 h-2.5 text-white" />}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3 flex gap-2">
                        <button
                          onClick={() => {
                            setAdvanced({ ...defaultAdvanced, themeColors: { ...emptyThemeColors }, features: { ...defaultAdvanced.features } });
                            setAdvancedApplied(false);
                            setShowAdvancedPanel(false);
                          }}
                          className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => { setAdvancedApplied(true); setShowAdvancedPanel(false); }}
                          className="flex-1 py-2 text-xs font-semibold gradient-bg text-white hover:opacity-90 rounded-xl transition-opacity"
                        >
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </PortalPopup>
              </div>
            </div>

            {/* ── Textarea + Generate button ──────────────────────────── */}
            <div className="relative px-4 pt-1.5 pb-2" onClick={closeAllDropdowns}>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => {
                  setPrompt(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="Describe your store… e.g. 'Create a modern fashion store for women's clothing with a minimalist aesthetic and rose gold palette'"
                rows={3}
                className="w-full resize-none text-slate-800 text-sm outline-none placeholder:text-slate-400 leading-relaxed bg-transparent pb-12 overflow-hidden"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="absolute bottom-4 right-6 z-10 flex items-center gap-2 px-5 py-3 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Store
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-4 mt-3 sm:mt-5">
            <div className="flex -space-x-2">
              {[
                { color: '#10b981', initial: 'R' },
                { color: '#0ea5e9', initial: 'S' },
                { color: '#f59e0b', initial: 'M' },
                { color: '#ec4899', initial: 'K' },
                { color: '#8b5cf6', initial: 'D' },
              ].map(({ color, initial }) => (
                <div
                  key={initial}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ background: color }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">1,000+</span> stores created and growing 🚀
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Generating overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-4"
          >
            {/* Animated brand icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="relative mb-8"
            >
              <div className="w-20 h-20 gradient-bg rounded-3xl flex items-center justify-center shadow-xl">
                <Loader2 className="w-9 h-9 text-white animate-spin" />
              </div>
            </motion.div>

            {/* Title & prompt */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-bold text-slate-900 mb-2"
            >
              Building your store...
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-slate-400 text-center max-w-lg mb-10 leading-relaxed line-clamp-3"
            >
              {prompt}
            </motion.p>

            {/* Steps */}
            <div className="w-full max-w-sm space-y-3">
              {generatingSteps.map(({ label, PendingIcon }, i) => {
                const completed = i < generatingStep;
                const active = i === generatingStep;
                const pending = i > generatingStep;
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors duration-300 ${
                      completed || active
                        ? 'bg-teal-50'
                        : 'bg-slate-50'
                    }`}
                  >
                    {completed && (
                      <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                    )}
                    {active && (
                      <Loader2 className="w-5 h-5 text-teal-500 flex-shrink-0 animate-spin" />
                    )}
                    {pending && (
                      <PendingIcon className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-semibold ${
                      completed || active ? 'text-teal-700' : 'text-slate-300'
                    }`}>
                      {label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
