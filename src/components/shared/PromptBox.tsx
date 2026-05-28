'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Store as StoreIcon, Palette, Globe, X, Check, SlidersHorizontal,
} from 'lucide-react';
import type { AdvancedOptions, ThemeColors } from '../../lib/claudeApiClient';
import type { StoreCurrency } from '../../context/StoreContext';

// ── Shared constants ─────────────────────────────────────────────────────────

export const PROMPT_LANGUAGES = [
  'English', 'Bahasa Indonesia', 'Español', 'Français', 'Deutsch',
  '日本語', '한국어', '中文',
];

export const PROMPT_CURRENCIES: StoreCurrency[] = [
  { code: 'USD', symbol: '$',  label: 'US Dollar' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'EUR', symbol: '€',  label: 'Euro' },
  { code: 'GBP', symbol: '£',  label: 'British Pound' },
  { code: 'JPY', symbol: '¥',  label: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit' },
];

export const SINGLE_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#0f172a',
];

export const GRADIENT_PRESETS: [string, string][] = [
  ['#10b981', '#14b8a6'], ['#10b981', '#06b6d4'], ['#3b82f6', '#06b6d4'],
  ['#3b82f6', '#8b5cf6'], ['#8b5cf6', '#ec4899'], ['#ec4899', '#f97316'],
  ['#f97316', '#eab308'], ['#f59e0b', '#ef4444'], ['#ef4444', '#8b5cf6'],
  ['#06b6d4', '#6366f1'], ['#10b981', '#8b5cf6'], ['#ec4899', '#06b6d4'],
];

export const EMPTY_THEME_COLORS: ThemeColors = {
  primary: '', secondary: '', accent: '', background: '', surface: '',
  textPrimary: '', textSecondary: '', border: '', success: '', danger: '',
};

export const DEFAULT_ADVANCED: AdvancedOptions = {
  themeColors: { ...EMPTY_THEME_COLORS },
  mood: '',
  audience: '',
  productCount: '',
  features: {
    reviews: true, wishlist: true, newsletter: true, promoBar: true,
    faq: true, testimonials: true, brandStory: true, trustBadges: true,
  },
};

const THEME_COLOR_ENTRIES: { key: keyof ThemeColors; label: string }[] = [
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

const MOOD_OPTIONS: { value: AdvancedOptions['mood']; label: string; emoji: string }[] = [
  { value: 'luxury',       label: 'Luxury',       emoji: '💎' },
  { value: 'casual',       label: 'Casual',       emoji: '😊' },
  { value: 'energetic',    label: 'Energetic',    emoji: '⚡' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'romantic',     label: 'Romantic',     emoji: '🌸' },
];

const PRODUCT_COUNT_OPTIONS: { value: AdvancedOptions['productCount']; label: string; sub: string }[] = [
  { value: 'few',    label: 'Few',      sub: '~6 items'  },
  { value: 'medium', label: 'Standard', sub: '~12 items' },
  { value: 'many',   label: 'Many',     sub: '~18 items' },
];

const FEATURE_LIST: { key: keyof AdvancedOptions['features']; label: string; emoji: string }[] = [
  { key: 'reviews',     label: 'Reviews',      emoji: '⭐' },
  { key: 'wishlist',    label: 'Wishlist',      emoji: '❤️' },
  { key: 'newsletter',  label: 'Newsletter',    emoji: '📧' },
  { key: 'promoBar',    label: 'Promo Bar',     emoji: '📢' },
  { key: 'faq',         label: 'FAQ',           emoji: '❓' },
  { key: 'testimonials',label: 'Testimonials',  emoji: '💬' },
  { key: 'brandStory',  label: 'Brand Story',   emoji: '📖' },
  { key: 'trustBadges', label: 'Trust Badges',  emoji: '🛡️' },
];

// ── Portal popup (escapes stacking context) ──────────────────────────────────

function PortalPopup({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// Smart positioning: opens popup near a trigger button, stays in viewport
function useSmartPos(
  btnRef: React.RefObject<HTMLElement | null>,
  popupW: number,
  popupH: number,
  offsetX = 0,
  topBarH = 0,
): React.CSSProperties {
  const [pos, setPos] = useState<React.CSSProperties>({ position: 'fixed', top: 0, left: 0 });
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(r.left + offsetX, vw - popupW - 8);
    let top = r.bottom + 6;
    if (top + popupH > vh - 8) top = Math.max(topBarH + 8, r.top - popupH - 6);
    setPos({ position: 'fixed', top, left, zIndex: 9999 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return pos;
}

// ── Sub-popups ────────────────────────────────────────────────────────────────

function ColorPickerPopup({
  btnRef, color1, color2, colorMode, colorPicked,
  setColor1, setColor2, setColorMode, setColorPicked, onClose,
}: {
  btnRef: React.RefObject<HTMLElement | null>;
  color1: string; color2: string;
  colorMode: 'single' | 'gradient'; colorPicked: boolean;
  setColor1: (v: string) => void; setColor2: (v: string) => void;
  setColorMode: (m: 'single' | 'gradient') => void;
  setColorPicked: (v: boolean) => void; onClose: () => void;
}) {
  const pos = useSmartPos(btnRef, 288, 360);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
      className="w-72 bg-white rounded-2xl border border-slate-200/80 p-4"
      style={{ ...pos, boxShadow: '0 8px 32px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {/* Mode tabs */}
      <div className="flex gap-1.5 mb-4 bg-slate-100 p-1 rounded-xl">
        {(['single', 'gradient'] as const).map(mode => (
          <button key={mode} onClick={() => setColorMode(mode)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${colorMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {mode === 'single' ? 'Single Color' : 'Gradient'}
          </button>
        ))}
      </div>
      {colorMode === 'single' ? (
        <>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Presets</p>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {SINGLE_PRESETS.map(c => (
              <button key={c} onClick={() => { setColor1(c); setColorPicked(true); }}
                className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 ${color1 === c ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Custom</p>
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5">
            <label className="relative flex-shrink-0 cursor-pointer group">
              <div className="w-7 h-7 rounded-lg border border-slate-200 transition-all group-hover:scale-105"
                style={{ background: colorPicked ? color1 : 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)' }} />
              <input type="color" value={color1} onChange={e => { setColor1(e.target.value); setColorPicked(true); }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </label>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            <input type="text" value={colorPicked ? color1 : ''} maxLength={7} placeholder="#"
              onChange={e => { const v = e.target.value; const h = v.startsWith('#') ? v : '#' + v; setColor1(h); if (/^#[0-9a-fA-F]{3,6}$/.test(h)) setColorPicked(true); }}
              className="flex-1 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none" />
            {colorPicked && <button onClick={() => setColorPicked(false)} className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"><X className="w-3 h-3" /></button>}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Presets</p>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {GRADIENT_PRESETS.map(([c1, c2], i) => (
              <button key={i} onClick={() => { setColor1(c1); setColor2(c2); setColorPicked(true); }}
                className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 ${color1 === c1 && color2 === c2 ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''}`}
                style={{ background: `linear-gradient(135deg,${c1},${c2})` }} />
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Custom</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ c: color1, setC: setColor1 }, { c: color2, setC: setColor2 }].map(({ c, setC }, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5 min-w-0">
                <label className="relative flex-shrink-0 cursor-pointer group">
                  <div className="w-7 h-7 rounded-lg border border-slate-200 transition-all group-hover:scale-105"
                    style={{ background: colorPicked ? c : 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)' }} />
                  <input type="color" value={c} onChange={e => { setC(e.target.value); setColorPicked(true); }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                </label>
                <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                <input type="text" value={colorPicked ? c : ''} maxLength={7} placeholder="#"
                  onChange={e => { const v = e.target.value; const h = v.startsWith('#') ? v : '#' + v; setC(h); if (/^#[0-9a-fA-F]{3,6}$/.test(h)) setColorPicked(true); }}
                  className="w-0 flex-1 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none" />
              </div>
            ))}
          </div>
          <div className={`h-7 rounded-xl mt-3 transition-opacity duration-200 ${colorPicked ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ background: `linear-gradient(90deg,${color1},${color2})` }} />
        </>
      )}
      <div className="flex gap-2 mt-3">
        {colorPicked && (
          <button onClick={() => { setColorPicked(false); onClose(); }}
            className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Reset</button>
        )}
        <button onClick={onClose}
          className="flex-1 py-2 text-xs font-semibold gradient-bg text-white hover:opacity-90 rounded-xl transition-opacity">Apply</button>
      </div>
    </motion.div>
  );
}

function LangPopup({ btnRef, selectedLang, setSelectedLang, onClose }: {
  btnRef: React.RefObject<HTMLElement | null>;
  selectedLang: string; setSelectedLang: (l: string) => void; onClose: () => void;
}) {
  const pos = useSmartPos(btnRef, 208, 280);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
      className="w-52 bg-white rounded-2xl border border-slate-200/80 py-2"
      style={{ ...pos, boxShadow: '0 8px 32px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)' }}>
      {PROMPT_LANGUAGES.map(lang => (
        <button key={lang} onClick={() => { setSelectedLang(lang); onClose(); }}
          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <span>{lang}</span>
          {selectedLang === lang && <Check className="w-3.5 h-3.5 text-emerald-500" />}
        </button>
      ))}
    </motion.div>
  );
}

function CurrPopup({ btnRef, selectedCurr, setSelectedCurr, onClose }: {
  btnRef: React.RefObject<HTMLElement | null>;
  selectedCurr: StoreCurrency | null; setSelectedCurr: (c: StoreCurrency) => void; onClose: () => void;
}) {
  const pos = useSmartPos(btnRef, 224, 260);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
      className="w-56 bg-white rounded-2xl border border-slate-200/80 py-2"
      style={{ ...pos, boxShadow: '0 8px 32px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)' }}>
      {PROMPT_CURRENCIES.map(curr => (
        <button key={curr.code} onClick={() => { setSelectedCurr(curr); onClose(); }}
          className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <span className="flex items-center gap-2.5">
            <span className="font-bold text-slate-900 w-6 text-center">{curr.symbol}</span>
            <span>{curr.label}</span>
          </span>
          {selectedCurr?.code === curr.code && <Check className="w-3.5 h-3.5 text-emerald-500" />}
        </button>
      ))}
    </motion.div>
  );
}

function AdvancedPopup({ btnRef, advanced, setAdvanced, onClose }: {
  btnRef: React.RefObject<HTMLElement | null>;
  advanced: AdvancedOptions; setAdvanced: React.Dispatch<React.SetStateAction<AdvancedOptions>>; onClose: () => void;
}) {
  const pos = useSmartPos(btnRef, 384, 620, 0, 64);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
      className="w-96 bg-white rounded-2xl border border-slate-200/80 flex flex-col"
      style={{ ...pos, boxShadow: '0 8px 32px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)', overflow: 'hidden', maxHeight: '80vh' }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Advanced Options</p>
          <p className="text-xs text-slate-400 mt-0.5">Guide the AI with more specific instructions</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* Theme Colors */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Theme Colors</p>
            <button onClick={() => setAdvanced(p => ({ ...p, themeColors: { ...EMPTY_THEME_COLORS } }))}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">Clear all</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {THEME_COLOR_ENTRIES.map(({ key, label }) => {
              const val = advanced.themeColors[key];
              const isSet = val && /^#[0-9a-fA-F]{3,6}$/.test(val);
              return (
                <div key={key} className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-0.5">{label}</p>
                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5 group">
                    <label className="relative flex-shrink-0 cursor-pointer">
                      <div className="w-7 h-7 rounded-lg border border-slate-200 flex-shrink-0 transition-all group-hover:scale-105"
                        style={{ background: isSet ? val : 'repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#f8fafc 3px,#f8fafc 6px)' }} />
                      <input type="color" value={isSet ? val : '#ffffff'}
                        onChange={e => setAdvanced(p => ({ ...p, themeColors: { ...p.themeColors, [key]: e.target.value } }))}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                    </label>
                    <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                    <input type="text" value={val} maxLength={7} placeholder="#"
                      onChange={e => { let r = e.target.value; if (r && !r.startsWith('#')) r = '#' + r; setAdvanced(p => ({ ...p, themeColors: { ...p.themeColors, [key]: r } })); }}
                      className="flex-1 min-w-0 bg-transparent text-sm font-mono text-slate-700 placeholder:text-slate-300 outline-none" />
                    {val && <button onClick={() => setAdvanced(p => ({ ...p, themeColors: { ...p.themeColors, [key]: '' } }))}
                      className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"><X className="w-3 h-3" /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Mood */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Store Mood</p>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setAdvanced(p => ({ ...p, mood: p.mood === opt.value ? '' : opt.value }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${advanced.mood === opt.value ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'}`}>
                <span>{opt.emoji}</span>{opt.label}
                {advanced.mood === opt.value && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
        {/* Audience */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Target Audience</p>
          <input type="text" value={advanced.audience}
            onChange={e => setAdvanced(p => ({ ...p, audience: e.target.value }))}
            placeholder="e.g. young women 18–28, tech enthusiasts, parents..."
            className="w-full h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:bg-white transition-colors" />
        </div>
        {/* Product Count */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Number of Products</p>
          <div className="flex gap-2">
            {PRODUCT_COUNT_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setAdvanced(p => ({ ...p, productCount: p.productCount === opt.value ? '' : opt.value }))}
                className={`flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl border text-center transition-all ${advanced.productCount === opt.value ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'}`}>
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
            <button onClick={() => {
              const allOn = FEATURE_LIST.every(f => advanced.features[f.key]);
              setAdvanced(p => ({ ...p, features: Object.fromEntries(FEATURE_LIST.map(f => [f.key, !allOn])) as AdvancedOptions['features'] }));
            }} className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              {FEATURE_LIST.every(f => advanced.features[f.key]) ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {FEATURE_LIST.map(f => (
              <button key={f.key}
                onClick={() => setAdvanced(p => ({ ...p, features: { ...p.features, [f.key]: !p.features[f.key] } }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${advanced.features[f.key] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                <span className="text-sm leading-none">{f.emoji}</span>
                <span className="flex-1">{f.label}</span>
                <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${advanced.features[f.key] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                  {advanced.features[f.key] && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3 flex gap-2">
        <button onClick={() => { setAdvanced({ ...DEFAULT_ADVANCED, themeColors: { ...EMPTY_THEME_COLORS } }); onClose(); }}
          className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Reset</button>
        <button onClick={onClose}
          className="flex-1 py-2 text-xs font-semibold gradient-bg text-white hover:opacity-90 rounded-xl transition-opacity">Apply</button>
      </div>
    </motion.div>
  );
}

// ── PromptBox state ───────────────────────────────────────────────────────────

export interface PromptBoxValue {
  brandName: string;
  prompt: string;
  color1: string;
  color2: string;
  colorMode: 'single' | 'gradient';
  colorPicked: boolean;
  selectedLang: string;
  selectedCurr: StoreCurrency | null;
  advanced: AdvancedOptions;
  advancedApplied: boolean;
}

// ── Main PromptBox component ──────────────────────────────────────────────────

export interface PromptBoxProps {
  /** Initial values — passed once on mount */
  initial?: Partial<PromptBoxValue>;
  /** Called whenever any field changes */
  onChange?: (val: PromptBoxValue) => void;
  /** Show the Generate button and call this on submit */
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  /** Compact mode: no outer shadow ring (for use inside a modal) */
  compact?: boolean;
  placeholder?: string;
}

export default function PromptBox({
  initial = {},
  onChange,
  onSubmit,
  submitLabel = 'Generate',
  submitDisabled = false,
  compact = false,
  placeholder = "Describe your store… e.g. 'A modern fashion store for women with minimalist aesthetic'",
}: PromptBoxProps) {
  const [brandName,       setBrandName]       = useState(initial.brandName ?? '');
  const [brandNameActive, setBrandNameActive] = useState(!!(initial.brandName));
  const [prompt,          setPrompt]          = useState(initial.prompt ?? '');
  const [color1,          setColor1]          = useState(initial.color1 ?? '#10b981');
  const [color2,          setColor2]          = useState(initial.color2 ?? '#06b6d4');
  const [colorMode,       setColorMode]       = useState<'single' | 'gradient'>(initial.colorMode ?? 'single');
  const [colorPicked,     setColorPicked]     = useState(initial.colorPicked ?? false);
  const [selectedLang,    setSelectedLang]    = useState(initial.selectedLang ?? '');
  const [selectedCurr,    setSelectedCurr]    = useState<StoreCurrency | null>(initial.selectedCurr ?? null);
  const [advanced,        setAdvanced]        = useState<AdvancedOptions>(initial.advanced ?? { ...DEFAULT_ADVANCED });
  const [advancedApplied, setAdvancedApplied] = useState(initial.advancedApplied ?? false);

  const [isFocused,         setIsFocused]         = useState(false);
  const [showColorPicker,   setShowColorPicker]   = useState(false);
  const [showLangDropdown,  setShowLangDropdown]  = useState(false);
  const [showCurrDropdown,  setShowCurrDropdown]  = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);

  const brandInputRef = useRef<HTMLInputElement>(null);
  const colorBtnRef   = useRef<HTMLButtonElement>(null);
  const langBtnRef    = useRef<HTMLButtonElement>(null);
  const currBtnRef    = useRef<HTMLButtonElement>(null);
  const advancedBtnRef = useRef<HTMLButtonElement>(null);

  // Sync color1 → advanced.themeColors.primary
  useEffect(() => {
    if (!colorPicked) return;
    setAdvanced(p => ({ ...p, themeColors: { ...p.themeColors, primary: color1, ...(colorMode === 'gradient' ? { secondary: color2 } : {}) } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorPicked, color1, color2, colorMode]);

  // Notify parent on every change
  const val: PromptBoxValue = { brandName, prompt, color1, color2, colorMode, colorPicked, selectedLang, selectedCurr, advanced, advancedApplied };
  useEffect(() => { onChange?.(val); }, [brandName, prompt, color1, color2, colorMode, colorPicked, selectedLang, selectedCurr, advanced, advancedApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAll = () => { setShowColorPicker(false); setShowLangDropdown(false); setShowCurrDropdown(false); setShowAdvancedPanel(false); };
  const anyOpen = showColorPicker || showLangDropdown || showCurrDropdown || showAdvancedPanel;

  const boxClass = compact
    ? 'bg-white rounded-2xl border border-slate-200'
    : `bg-white rounded-2xl transition-all duration-300 ${isFocused || prompt.trim() || anyOpen
        ? 'shadow-[0_0_0_3px_rgba(16,185,129,0.15),0_4px_24px_rgba(0,0,0,0.08)]  border-2 border-emerald-300/60'
        : 'shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border-2 border-transparent hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)]'}`;

  return (
    <div
      className={boxClass}
      onFocus={() => setIsFocused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocused(false); }}
    >
      {/* ── Capsule row ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 flex-wrap">

        {/* Brand Name */}
        <div className="relative">
          {brandNameActive ? (
            <div className="flex items-center gap-1.5 h-8 bg-white border border-emerald-400 rounded-full px-3.5">
              <StoreIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <input
                ref={brandInputRef} autoFocus={!compact}
                value={brandName} onChange={e => setBrandName(e.target.value)}
                placeholder="Brand name..."
                className="bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none w-28 font-medium"
              />
              <button onClick={() => { setBrandNameActive(false); setBrandName(''); }}
                className="text-emerald-400 hover:text-emerald-600 transition-colors ml-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setBrandNameActive(true); setTimeout(() => brandInputRef.current?.focus(), 50); }}
              className="flex items-center gap-1.5 h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-full text-sm text-slate-600 font-medium transition-all duration-200">
              <StoreIcon className="w-3.5 h-3.5 text-emerald-500" />
              Brand name...
            </button>
          )}
        </div>

        {/* Color Style */}
        <div className="relative">
          <button ref={colorBtnRef}
            onClick={() => { setShowColorPicker(!showColorPicker); setShowLangDropdown(false); setShowCurrDropdown(false); setShowAdvancedPanel(false); }}
            className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium transition-all duration-200 border ${showColorPicker ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'}`}>
            <Palette className="w-3.5 h-3.5 flex-shrink-0" />
            {colorPicked && (
              <div className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-sm flex-shrink-0"
                style={{ background: colorMode === 'gradient' ? `linear-gradient(135deg,${color1},${color2})` : color1 }} />
            )}
          </button>
          <PortalPopup>
            <AnimatePresence>
              {showColorPicker && (
                <ColorPickerPopup btnRef={colorBtnRef} color1={color1} color2={color2} colorMode={colorMode}
                  colorPicked={colorPicked} setColor1={setColor1} setColor2={setColor2}
                  setColorMode={setColorMode} setColorPicked={setColorPicked}
                  onClose={() => setShowColorPicker(false)} />
              )}
            </AnimatePresence>
          </PortalPopup>
        </div>

        {/* Language */}
        <div className="relative">
          <button ref={langBtnRef}
            onClick={() => { setShowLangDropdown(!showLangDropdown); setShowColorPicker(false); setShowCurrDropdown(false); setShowAdvancedPanel(false); }}
            className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium transition-all duration-200 border ${showLangDropdown ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'}`}>
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            {selectedLang && <span className="whitespace-nowrap">{selectedLang}</span>}
          </button>
          <PortalPopup>
            <AnimatePresence>
              {showLangDropdown && (
                <LangPopup btnRef={langBtnRef} selectedLang={selectedLang}
                  setSelectedLang={setSelectedLang} onClose={() => setShowLangDropdown(false)} />
              )}
            </AnimatePresence>
          </PortalPopup>
        </div>

        {/* Currency */}
        <div className="relative">
          <button ref={currBtnRef}
            onClick={() => { setShowCurrDropdown(!showCurrDropdown); setShowColorPicker(false); setShowLangDropdown(false); setShowAdvancedPanel(false); }}
            className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium transition-all duration-200 border ${showCurrDropdown ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'}`}>
            <span className="font-semibold text-sm leading-none flex-shrink-0">{selectedCurr ? selectedCurr.symbol : '$'}</span>
            {selectedCurr && <span className="whitespace-nowrap">{selectedCurr.code}</span>}
          </button>
          <PortalPopup>
            <AnimatePresence>
              {showCurrDropdown && (
                <CurrPopup btnRef={currBtnRef} selectedCurr={selectedCurr}
                  setSelectedCurr={setSelectedCurr} onClose={() => setShowCurrDropdown(false)} />
              )}
            </AnimatePresence>
          </PortalPopup>
        </div>

        {/* Advanced Options */}
        <div className="relative ml-auto">
          <button ref={advancedBtnRef}
            onClick={() => { setShowAdvancedPanel(!showAdvancedPanel); setShowColorPicker(false); setShowLangDropdown(false); setShowCurrDropdown(false); }}
            className={`relative flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border ${showAdvancedPanel ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'}`}
            title="Advanced Options">
            <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
            {advancedApplied && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />}
          </button>
          <PortalPopup>
            <AnimatePresence>
              {showAdvancedPanel && (
                <AdvancedPopup btnRef={advancedBtnRef} advanced={advanced} setAdvanced={setAdvanced}
                  onClose={() => { setAdvancedApplied(true); setShowAdvancedPanel(false); }} />
              )}
            </AnimatePresence>
          </PortalPopup>
        </div>
      </div>

      {/* ── Textarea + submit ─────────────────────────────────────────────── */}
      <div className="relative px-4 pt-1.5 pb-2" onClick={closeAll}>
        <textarea
          value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`w-full resize-none text-slate-800 text-sm outline-none placeholder:text-slate-400 leading-relaxed bg-transparent overflow-hidden ${onSubmit ? 'pb-12' : 'pb-2'}`}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit?.(); }}
        />
        {onSubmit && (
          <button onClick={onSubmit} disabled={submitDisabled || (!prompt.trim() && !brandName.trim())}
            className="absolute bottom-4 right-6 z-10 flex items-center gap-2 px-5 py-3 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl">
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
