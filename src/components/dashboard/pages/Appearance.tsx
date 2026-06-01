'use client';

import { useState, useEffect } from 'react';
import { Palette, Type, Layout, Check, X, SlidersHorizontal, Save, Globe, Package } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { PROMPT_LANGUAGES, PROMPT_CURRENCIES, EMPTY_THEME_COLORS } from '../../shared/PromptBox';
import type { ThemeColors } from '../../../lib/claudeApiClient';
import type { StoreCurrency } from '../../../context/StoreContext';

// ── Static data ───────────────────────────────────────────────────────────────

const singlePresets = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#0f172a',
];

const gradientPresets: [string, string][] = [
  ['#10b981', '#14b8a6'], ['#10b981', '#06b6d4'],
  ['#3b82f6', '#06b6d4'], ['#3b82f6', '#8b5cf6'],
  ['#8b5cf6', '#ec4899'], ['#ec4899', '#f97316'],
  ['#f97316', '#eab308'], ['#f59e0b', '#ef4444'],
  ['#ef4444', '#8b5cf6'], ['#06b6d4', '#6366f1'],
  ['#10b981', '#8b5cf6'], ['#ec4899', '#06b6d4'],
];

const fonts = [
  { name: 'Inter' },
  { name: 'Poppins' },
  { name: 'DM Sans' },
  { name: 'Plus Jakarta Sans' },
  { name: 'Nunito' },
  { name: 'Geist' },
];

const layouts = [
  { id: 'minimal',  name: 'Minimal',  desc: 'Clean & spacious' },
  { id: 'bold',     name: 'Bold',     desc: 'High-impact visuals' },
  { id: 'elegant',  name: 'Elegant',  desc: 'Refined & premium' },
  { id: 'modern',   name: 'Modern',   desc: 'Fresh & dynamic' },
  { id: 'playful',  name: 'Playful',  desc: 'Fun & colorful' },
];

const moodOptions = [
  { value: 'luxury',       label: 'Luxury',       emoji: '💎' },
  { value: 'casual',       label: 'Casual',       emoji: '😊' },
  { value: 'energetic',    label: 'Energetic',    emoji: '⚡' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'romantic',     label: 'Romantic',     emoji: '🌸' },
] as const;

const productCountOptions = [
  { value: 'few',    label: 'Few',      sub: '~6 items'  },
  { value: 'medium', label: 'Standard', sub: '~12 items' },
  { value: 'many',   label: 'Many',     sub: '~18 items' },
] as const;

const featureList = [
  { key: 'reviews',      label: 'Reviews',      emoji: '⭐', desc: 'Product review section' },
  { key: 'wishlist',     label: 'Wishlist',     emoji: '❤️', desc: 'Save-for-later button' },
  { key: 'newsletter',   label: 'Newsletter',   emoji: '📧', desc: 'Email signup form' },
  { key: 'promoBar',     label: 'Promo Bar',    emoji: '📢', desc: 'Top announcement bar' },
  { key: 'faq',          label: 'FAQ',          emoji: '❓', desc: 'Frequently asked questions' },
  { key: 'testimonials', label: 'Testimonials', emoji: '💬', desc: 'Customer reviews section' },
  { key: 'brandStory',   label: 'Brand Story',  emoji: '📖', desc: 'About your brand section' },
  { key: 'trustBadges',  label: 'Trust Badges', emoji: '🛡️', desc: 'Security & trust icons' },
] as const;

type FeatureKey = typeof featureList[number]['key'];

// Theme color groups for organized display
const THEME_COLOR_GROUPS = [
  {
    label: 'Brand',
    desc: 'Accent & highlight color',
    entries: [
      { key: 'accent' as keyof ThemeColors, label: 'Accent' },
    ],
  },
  {
    label: 'Surfaces',
    desc: 'Page & card backgrounds',
    entries: [
      { key: 'background' as keyof ThemeColors, label: 'Background' },
      { key: 'surface'    as keyof ThemeColors, label: 'Surface' },
      { key: 'border'     as keyof ThemeColors, label: 'Border' },
    ],
  },
  {
    label: 'Text',
    desc: 'Typography colors',
    entries: [
      { key: 'textPrimary'   as keyof ThemeColors, label: 'Primary Text' },
      { key: 'textSecondary' as keyof ThemeColors, label: 'Secondary Text' },
    ],
  },
  {
    label: 'Feedback',
    desc: 'Status & notification colors',
    entries: [
      { key: 'success' as keyof ThemeColors, label: 'Success' },
      { key: 'danger'  as keyof ThemeColors, label: 'Danger' },
    ],
  },
];

// ── Reusable UI ───────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ColorSwatch({ bg, selected, onClick, title }: {
  bg: string; selected: boolean; onClick: () => void; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 flex-shrink-0 ${selected ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''}`}
      style={{ background: bg }}
    />
  );
}

function HexInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="flex flex-col gap-1 flex-1">
      {label && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>}
      <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5">
        <label className="relative flex-shrink-0 cursor-pointer group">
          <div
            className="w-7 h-7 rounded-lg border border-slate-200 transition-all group-hover:scale-105"
            style={{ background: value || 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)' }}
          />
          <input
            type="color"
            value={value || '#ffffff'}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
        <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={e => {
            const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
            onChange(v);
          }}
          placeholder="#"
          maxLength={7}
          className="flex-1 min-w-0 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none"
        />
        {value && (
          <button onClick={() => onChange('')} className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Appearance() {
  const { activeStore, updateActiveStore } = useStore();
  const design = activeStore?.design;
  const adv    = activeStore?.advancedOptions;

  // ── Derived initial values ──────────────────────────────────────────────────
  const initColor1  = activeStore?.primaryColor || '#10b981';
  const initColor2  = design?.accentColor && design.accentColor !== initColor1 ? design.accentColor : '#06b6d4';
  const isGradient  = !!(design?.accentColor && design.accentColor !== activeStore?.primaryColor);

  // ── State ───────────────────────────────────────────────────────────────────
  const [colorMode,    setColorMode]   = useState<'single' | 'gradient'>(isGradient ? 'gradient' : 'single');
  const [color1,       setColor1]      = useState(initColor1);
  const [color2,       setColor2]      = useState(initColor2);
  const [themeColors,  setThemeColors] = useState<ThemeColors>(adv?.themeColors ?? { ...EMPTY_THEME_COLORS });
  const [font,         setFont]        = useState(activeStore?.font || 'Inter');
  const [layout,       setLayout]      = useState<string>(design?.layoutStyle || 'minimal');
  const [mood,         setMood]        = useState(activeStore?.mood || adv?.mood || '');
  const [audience,     setAudience]    = useState(activeStore?.audience || adv?.audience || '');
  const [productCount, setProductCount]= useState<'' | 'few' | 'medium' | 'many'>(adv?.productCount || '');
  const [language,     setLanguage]    = useState(activeStore?.language || 'English');
  const [currency,     setCurrency]    = useState<StoreCurrency>(activeStore?.currency ?? PROMPT_CURRENCIES[0]);

  const initFeatures: Record<FeatureKey, boolean> = {
    reviews:      adv?.features?.reviews      ?? true,
    wishlist:     adv?.features?.wishlist     ?? true,
    newsletter:   adv?.features?.newsletter   ?? (design ? !!design.newsletter : true),
    promoBar:     adv?.features?.promoBar     ?? (design ? !!design.promoBar   : true),
    faq:          adv?.features?.faq          ?? (design ? !!(design.faq?.length)          : true),
    testimonials: adv?.features?.testimonials ?? (design ? !!(design.testimonials?.length) : true),
    brandStory:   adv?.features?.brandStory   ?? (design ? !!design.brandStory  : true),
    trustBadges:  adv?.features?.trustBadges  ?? (design ? !!(design.trustBadges?.length)  : true),
  };
  const [features, setFeatures] = useState(initFeatures);

  const [saved, setSaved] = useState(false);

  // Sync when active store switches
  useEffect(() => {
    const s   = activeStore;
    const d   = s?.design;
    const a   = s?.advancedOptions;
    const pc  = s?.primaryColor || '#10b981';
    const ac  = d?.accentColor;
    const grad = !!(ac && ac !== pc);
    setColor1(pc);
    setColorMode(grad ? 'gradient' : 'single');
    setColor2(ac && grad ? ac : '#06b6d4');
    setThemeColors(a?.themeColors ?? { ...EMPTY_THEME_COLORS });
    setFont(s?.font || 'Inter');
    setLayout(d?.layoutStyle || 'minimal');
    setMood(s?.mood || a?.mood || '');
    setAudience(s?.audience || a?.audience || '');
    setProductCount(a?.productCount || '');
    setLanguage(s?.language || 'English');
    setCurrency(s?.currency ?? PROMPT_CURRENCIES[0]);
    setFeatures({
      reviews:      a?.features?.reviews      ?? true,
      wishlist:     a?.features?.wishlist     ?? true,
      newsletter:   a?.features?.newsletter   ?? (d ? !!d.newsletter : true),
      promoBar:     a?.features?.promoBar     ?? (d ? !!d.promoBar   : true),
      faq:          a?.features?.faq          ?? (d ? !!(d.faq?.length) : true),
      testimonials: a?.features?.testimonials ?? (d ? !!(d.testimonials?.length) : true),
      brandStory:   a?.features?.brandStory   ?? (d ? !!d.brandStory  : true),
      trustBadges:  a?.features?.trustBadges  ?? (d ? !!(d.trustBadges?.length)  : true),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!activeStore) return;

    const newDesign = {
      ...(activeStore.design ?? {} as NonNullable<typeof activeStore.design>),
      layoutStyle:  layout as NonNullable<typeof activeStore.design>['layoutStyle'],
      accentColor:  colorMode === 'gradient' ? color2 : color1,
      newsletter:   features.newsletter   ? (activeStore.design?.newsletter ?? { headline: 'Stay in the loop', subtext: 'Subscribe for exclusive deals and new arrivals.' }) : undefined,
      promoBar:     features.promoBar     ? (activeStore.design?.promoBar   ?? '🎉 Free shipping on orders over $50!') : undefined,
      faq:          features.faq          ? (activeStore.design?.faq        ?? []) : undefined,
      brandStory:   features.brandStory   ? (activeStore.design?.brandStory ?? '') : undefined,
      trustBadges:  features.trustBadges  ? (activeStore.design?.trustBadges ?? []) : undefined,
    };

    // Merge new advancedOptions
    const newAdvancedOptions = {
      ...(activeStore.advancedOptions ?? {}),
      themeColors,
      mood:         mood as NonNullable<typeof activeStore.advancedOptions>['mood'],
      audience,
      productCount,
      features,
    };

    updateActiveStore({
      primaryColor:    color1,
      font,
      mood,
      audience,
      language,
      currency,
      advancedOptions: newAdvancedOptions,
      design:          newDesign,
    });

    // Sync to live store if published
    if (activeStore.status === 'Published') {
      const subdomain = activeStore.publishedDomain?.split('.')[0] ?? activeStore.domain?.split('.')[0];
      if (subdomain) {
        fetch('/api/publish-store', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain,
            name:         activeStore.name,
            primaryColor: color1,
            category:     activeStore.category,
            templateId:   activeStore.template?.id,
            design:       newDesign,
            currency,
            language,
            font,
            mood,
            audience,
          }),
        }).catch(console.error);
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Appearance</h2>
          <p className="text-slate-500 text-sm mt-0.5">Customize your store's look and feel</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            saved ? 'bg-emerald-500 text-white' : 'gradient-bg text-white hover:opacity-90'
          }`}
        >
          {saved ? <><Check className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Changes</>}
        </button>
      </div>

      {/* ── Brand Color ──────────────────────────────────────────────────────── */}
      <Section icon={Palette} title="Brand Color" subtitle="Primary color used across buttons, links, and highlights">

        {/* Mode tabs */}
        <div className="flex gap-1.5 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
          {(['single', 'gradient'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`px-5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                colorMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode === 'single' ? 'Single Color' : 'Gradient'}
            </button>
          ))}
        </div>

        {colorMode === 'single' ? (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Presets</p>
            <div className="flex flex-wrap gap-2.5 mb-5">
              {singlePresets.map(c => (
                <ColorSwatch key={c} bg={c} selected={color1 === c} onClick={() => setColor1(c)} title={c} />
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom</p>
            <div className="max-w-xs">
              <HexInput value={color1} onChange={setColor1} />
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Presets</p>
            <div className="flex flex-wrap gap-2.5 mb-5">
              {gradientPresets.map(([c1, c2], i) => (
                <ColorSwatch
                  key={i}
                  bg={`linear-gradient(135deg, ${c1}, ${c2})`}
                  selected={color1 === c1 && color2 === c2}
                  onClick={() => { setColor1(c1); setColor2(c2); }}
                />
              ))}
            </div>
            <div className="h-8 rounded-xl mb-4 transition-all" style={{ background: `linear-gradient(90deg, ${color1}, ${color2})` }} />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom</p>
            <div className="flex gap-3">
              <HexInput value={color1} onChange={setColor1} label="Color 1" />
              <HexInput value={color2} onChange={setColor2} label="Color 2" />
            </div>
          </>
        )}
      </Section>

      {/* ── Theme Colors ─────────────────────────────────────────────────────── */}
      <Section icon={Palette} title="Theme Colors" subtitle="Fine-tune individual colors for surfaces, text, and feedback states">
        <div className="space-y-5">
          {THEME_COLOR_GROUPS.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.label}</p>
                <span className="text-[10px] text-slate-400">— {group.desc}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.entries.map(({ key, label }) => (
                  <HexInput
                    key={key}
                    label={label}
                    value={themeColors[key] || ''}
                    onChange={v => setThemeColors(prev => ({ ...prev, [key]: v }))}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400 flex items-start gap-1.5 pt-1">
            <span>💡</span>
            Leave fields empty to let the AI choose colors based on your brand.
            Filled fields override the AI-generated palette.
          </p>
        </div>
      </Section>

      {/* ── Typography ───────────────────────────────────────────────────────── */}
      <Section icon={Type} title="Typography" subtitle="Font family used across the store">
        <div className="grid grid-cols-3 gap-3">
          {fonts.map(f => (
            <button
              key={f.name}
              onClick={() => setFont(f.name)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${font === f.name ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <p className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: f.name }}>Aa</p>
              <p className="text-xs text-slate-500 truncate">{f.name}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Layout Style ─────────────────────────────────────────────────────── */}
      <Section icon={Layout} title="Layout Style" subtitle="Overall visual structure of your store">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {layouts.map(l => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${layout === l.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="space-y-1.5 mb-3">
                <div className={`h-2 rounded-full bg-slate-300 ${l.id === 'bold' ? 'w-full' : l.id === 'playful' ? 'w-2/3' : 'w-3/4'}`} />
                <div className="h-1.5 rounded-full bg-slate-200 w-1/2" />
              </div>
              <p className="text-xs font-bold text-slate-900">{l.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{l.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Localization ─────────────────────────────────────────────────────── */}
      <Section icon={Globe} title="Localization" subtitle="Store language and currency displayed to customers">

        {/* Language */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Language</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROMPT_LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-center transition-all ${
                  language === lang
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Currency</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROMPT_CURRENCIES.map(curr => (
              <button
                key={curr.code}
                onClick={() => setCurrency(curr)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                  currency?.code === curr.code
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span className="font-bold text-base leading-none">{curr.symbol}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{curr.code}</p>
                  <p className="text-[10px] text-slate-400 truncate">{curr.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Advanced ─────────────────────────────────────────────────────────── */}
      <Section icon={SlidersHorizontal} title="Advanced" subtitle="Tone, audience, catalog size, and optional features">

        {/* Store Mood */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Store Mood</p>
          <div className="flex flex-wrap gap-2">
            {moodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMood(prev => prev === opt.value ? '' : opt.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  mood === opt.value
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span>{opt.emoji}</span>
                {opt.label}
                {mood === opt.value && <Check className="w-3.5 h-3.5 ml-0.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Target Audience</p>
          <input
            type="text"
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder="e.g. young women 18–28, tech enthusiasts, parents..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-colors"
          />
        </div>

        {/* Product Count */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Catalog Size</p>
          <div className="flex gap-2">
            {productCountOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setProductCount(prev => prev === opt.value ? '' : opt.value)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  productCount === opt.value
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] text-slate-400">{opt.sub}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Controls how many products are displayed on the homepage.</p>
        </div>

        {/* Optional Features */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Optional Features</p>
            <button
              onClick={() => {
                const allOn = featureList.every(f => features[f.key]);
                setFeatures(prev => {
                  const next = { ...prev };
                  featureList.forEach(f => { next[f.key] = !allOn; });
                  return next;
                });
              }}
              className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {featureList.every(f => features[f.key]) ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {featureList.map(f => (
              <button
                key={f.key}
                onClick={() => setFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  features[f.key]
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="text-base leading-none flex-shrink-0">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-none">{f.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{f.desc}</p>
                </div>
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  features[f.key] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                }`}>
                  {features[f.key] && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Section>

    </div>
  );
}
