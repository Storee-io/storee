'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Monitor, Tablet, Smartphone, ChevronDown, ChevronRight, ChevronUp,
  Check, Save, Globe, ArrowLeft, Sparkles, Mail,
  BookOpen, Megaphone, Layers, Plus, Trash2,
  Star, HelpCircle, Type,
  Edit2, Eye, GripVertical, MousePointer, Layout,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import StorePreview from '../preview/StorePreview';
import type { Store } from '../../context/StoreContext';
import type { StoreDesign } from '../../lib/claudeApi';

type Device = 'desktop' | 'tablet' | 'mobile';

// ── Section metadata ──────────────────────────────────────────────────────────

const SECTION_META: Record<string, { label: string; icon: React.ElementType; editHint: string }> = {
  hero:         { label: 'Hero',         icon: Layout,      editHint: 'Headline, subtitle, CTA button' },
  trust:        { label: 'Trust Badges', icon: Check,       editHint: 'Badge icons and labels' },
  collections:  { label: 'Collections',  icon: Layers,      editHint: 'Collection tabs' },
  products:     { label: 'Products',     icon: Sparkles,    editHint: 'Product grid' },
  features:     { label: 'Features',     icon: Sparkles,    editHint: 'Feature titles & descriptions' },
  testimonials: { label: 'Testimonials', icon: Star,        editHint: 'Review text, author, role' },
  stats:        { label: 'Stats',        icon: Type,        editHint: 'Stat numbers and labels' },
  brandStory:   { label: 'Brand Story',  icon: BookOpen,    editHint: 'Your brand story text' },
  faq:          { label: 'FAQ',          icon: HelpCircle,  editHint: 'Questions and answers' },
  newsletter:   { label: 'Newsletter',   icon: Mail,        editHint: 'Headline and subtext' },
  promoBar:     { label: 'Promo Bar',    icon: Megaphone,   editHint: 'Announcement text' },
};

const DEFAULT_SECTION_ORDER = ['hero', 'trust', 'collections', 'products', 'features', 'testimonials', 'stats', 'brandStory', 'faq', 'newsletter'];

const FIELD_LABELS: Record<string, string> = {
  heroTitle:          'Headline',
  heroSubtitle:       'Subheadline',
  ctaText:            'CTA Button',
  promoBar:           'Promo Bar Text',
  brandStory:         'Brand Story',
  'newsletter.headline': 'Newsletter Headline',
  'newsletter.subtext':  'Newsletter Subtext',
};
function getFieldLabel(field: string) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const m = field.match(/^(features|testimonials|faq)\.(\d+)\.(.*)/);
  if (m) {
    const section = m[1] === 'faq' ? 'FAQ' : m[1].charAt(0).toUpperCase() + m[1].slice(1, -1);
    const idx = parseInt(m[2]) + 1;
    const key = m[3];
    return `${section} ${idx} — ${key.charAt(0).toUpperCase() + key.slice(1)}`;
  }
  return field;
}

// ── Shared form primitives ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white transition-all placeholder:text-slate-300"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white resize-none transition-all placeholder:text-slate-300"
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 cursor-pointer shadow-sm">
        <div className="absolute inset-0" style={{ background: value }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white transition-all"
      />
    </div>
  );
}

function Section({ icon: Icon, title, open, onToggle, children }: {
  icon: React.ElementType; title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section item with drag handle ─────────────────────────────────────────────

interface SectionItem {
  type: string;
  hasContent: boolean;
}

function sectionHasContent(type: string, design: StoreDesign | undefined): boolean {
  if (!design) return false;
  switch (type) {
    case 'hero':         return true;
    case 'trust':        return (design.trustBadges?.length ?? 0) > 0;
    case 'collections':  return (design.collections?.length ?? 0) > 0;
    case 'products':     return (design.products?.length ?? 0) > 0;
    case 'features':     return (design.features?.length ?? 0) > 0;
    case 'testimonials': return (design.testimonials?.length ?? 0) > 0;
    case 'stats':        return (design.stats?.length ?? 0) > 0;
    case 'brandStory':   return !!design.brandStory;
    case 'faq':          return (design.faq?.length ?? 0) > 0;
    case 'newsletter':   return !!design.newsletter?.headline;
    default:             return false;
  }
}

function deriveInitialSections(design: StoreDesign | undefined): SectionItem[] {
  const dt = design?.designTokens;
  const ds = design?.designSystem;
  let order: string[];
  if (dt?.sections?.length) {
    order = (dt.sections as Array<{ type: string }>).map(s => s.type);
  } else if (dt?.sectionOrder?.length) {
    order = dt.sectionOrder as string[];
  } else if (ds?.sectionOrder?.length) {
    order = ds.sectionOrder as string[];
  } else {
    order = DEFAULT_SECTION_ORDER;
  }
  return order.map(type => ({ type, hasContent: sectionHasContent(type, design) }));
}

// ── Edit mode CSS injector ────────────────────────────────────────────────────

function EditModeCss({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <style>{`
      [data-canvas-field] {
        cursor: text !important;
        border-radius: 2px;
        transition: box-shadow 0.12s ease;
      }
      [data-canvas-field]:hover {
        box-shadow: inset 0 0 0 2px #10b981 !important;
      }
      [data-canvas-field]:focus,
      [data-canvas-field][data-ce] {
        box-shadow: inset 0 0 0 2px #059669 !important;
        background: rgba(16, 185, 129, 0.06) !important;
      }
    `}</style>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  store: Store;
  from?: string | null;
}

export default function CanvasShell({ store, from }: Props) {
  const { updateActiveStore, activeStore } = useStore();
  const router = useRouter();
  const [device, setDevice] = useState<Device>('desktop');
  const [openSection, setOpenSection] = useState<string>('hero');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'sections' | 'properties'>('sections');
  const [draggingType, setDraggingType] = useState<string | null>(null);

  // Live store from context
  const liveContextStore = activeStore?.id === store.id ? activeStore : store;
  const d = liveContextStore.design;

  // Local editable state
  const [storeName,     setStoreName]     = useState(liveContextStore.name ?? '');
  const [tagline,       setTagline]       = useState(d?.tagline ?? '');
  const [heroTitle,     setHeroTitle]     = useState(d?.heroTitle ?? '');
  const [heroSubtitle,  setHeroSubtitle]  = useState(d?.heroSubtitle ?? '');
  const [ctaText,       setCtaText]       = useState(d?.ctaText ?? '');
  const [promoBar,      setPromoBar]      = useState(d?.promoBar ?? '');
  const [primaryColor,  setPrimaryColor]  = useState(liveContextStore.primaryColor ?? '#10b981');
  const [accentColor,   setAccentColor]   = useState(d?.accentColor ?? '#06b6d4');
  const [brandStory,    setBrandStory]    = useState(d?.brandStory ?? '');
  const [features,      setFeatures]      = useState(d?.features ?? []);
  const [testimonials,  setTestimonials]  = useState(d?.testimonials ?? []);
  const [faq,           setFaq]           = useState(d?.faq ?? []);
  const [newsletter,    setNewsletter]    = useState(d?.newsletter ?? { headline: '', subtext: '' });
  const [navLinks,      setNavLinks]      = useState<string[]>(d?.navLinks ?? []);
  const [trustBadges,   setTrustBadges]   = useState<Array<{ icon: string; text: string }>>(d?.trustBadges ?? []);
  const [stats,         setStats]         = useState<Array<{ value: string; label: string }>>(d?.stats ?? []);
  const [sectionHeadings, setSectionHeadings] = useState<{ testimonials?: string; features?: string; products?: string; faq?: string; newsletter?: string }>(d?.sectionHeadings ?? {});
  const [footerNote,      setFooterNote]      = useState(d?.footerNote ?? '');

  // Section order for drag reorder
  const [sectionItems, setSectionItems] = useState<SectionItem[]>(() => deriveInitialSections(d));

  // Sync from context when store id changes
  useEffect(() => {
    if (!liveContextStore) return;
    const ds = liveContextStore.design;
    setStoreName(liveContextStore.name ?? '');
    setTagline(ds?.tagline ?? '');
    setHeroTitle(ds?.heroTitle ?? '');
    setHeroSubtitle(ds?.heroSubtitle ?? '');
    setCtaText(ds?.ctaText ?? '');
    setPromoBar(ds?.promoBar ?? '');
    setPrimaryColor(liveContextStore.primaryColor ?? '#10b981');
    setAccentColor(ds?.accentColor ?? '#06b6d4');
    setBrandStory(ds?.brandStory ?? '');
    setFeatures(ds?.features ?? []);
    setTestimonials(ds?.testimonials ?? []);
    setFaq(ds?.faq ?? []);
    setNewsletter(ds?.newsletter ?? { headline: '', subtext: '' });
    setNavLinks(ds?.navLinks ?? []);
    setTrustBadges(ds?.trustBadges ?? []);
    setStats(ds?.stats ?? []);
    setSectionHeadings(ds?.sectionHeadings ?? {});
    setFooterNote(ds?.footerNote ?? '');
    setSectionItems(deriveInitialSections(ds));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContextStore.id, liveContextStore.design, liveContextStore.primaryColor]);

  // ── onFieldChange handler (called from canvas contenteditable) ────────────

  const handleFieldChange = useCallback((field: string, value: string) => {
    if (field === 'heroTitle')           { setHeroTitle(value); return; }
    if (field === 'heroSubtitle')        { setHeroSubtitle(value); return; }
    if (field === 'ctaText')             { setCtaText(value); return; }
    if (field === 'promoBar')            { setPromoBar(value); return; }
    if (field === 'brandStory')          { setBrandStory(value); return; }
    if (field === 'newsletter.headline') { setNewsletter(n => ({ ...n, headline: value })); return; }
    if (field === 'newsletter.subtext')  { setNewsletter(n => ({ ...n, subtext: value })); return; }

    const featM = field.match(/^features\.(\d+)\.(title|description)$/);
    if (featM) {
      const idx = parseInt(featM[1]);
      const key = featM[2] as 'title' | 'description';
      setFeatures(prev => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
      return;
    }
    const testM = field.match(/^testimonials\.(\d+)\.(text|author|role)$/);
    if (testM) {
      const idx = parseInt(testM[1]);
      const key = testM[2] as 'text' | 'author' | 'role';
      setTestimonials(prev => prev.map((t, i) => i === idx ? { ...t, [key]: value } : t));
      return;
    }
    const faqM = field.match(/^faq\.(\d+)\.(q|a)$/);
    if (faqM) {
      const idx = parseInt(faqM[1]);
      const key = faqM[2] as 'q' | 'a';
      setFaq(prev => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
      return;
    }
    if (field === 'storeName')  { setStoreName(value); return; }
    if (field === 'tagline')    { setTagline(value); return; }
    const navM = field.match(/^navLinks\.(\d+)$/);
    if (navM) {
      const idx = parseInt(navM[1]);
      setNavLinks(prev => prev.map((l, i) => i === idx ? value : l));
      return;
    }
    const badgeM = field.match(/^trustBadges\.(\d+)\.text$/);
    if (badgeM) {
      const idx = parseInt(badgeM[1]);
      setTrustBadges(prev => prev.map((b, i) => i === idx ? { ...b, text: value } : b));
      return;
    }
    const statM = field.match(/^stats\.(\d+)\.(value|label)$/);
    if (statM) {
      const idx = parseInt(statM[1]);
      const key = statM[2] as 'value' | 'label';
      setStats(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
      return;
    }
    const shM = field.match(/^sectionHeadings\.(testimonials|features|products|faq|newsletter)$/);
    if (shM) {
      const key = shM[1] as keyof typeof sectionHeadings;
      setSectionHeadings(prev => ({ ...prev, [key]: value }));
      return;
    }
    if (field === 'footerNote') { setFooterNote(value); return; }
  }, []);

  // ── Build preview store ───────────────────────────────────────────────────

  // Build sections array from current drag order (for designTokens stores)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildReorderedDesignTokens = (): any => {
    const dt = liveContextStore.design?.designTokens;
    if (!dt) return dt;
    // Preserve variant/props per section from the original
    const srcSections = (dt.sections ?? []) as Array<{ type: string; variant?: string; props?: unknown }>;
    const srcMap = new Map(srcSections.map(s => [s.type, s]));
    return {
      ...dt,
      sections: sectionItems.map(item => srcMap.get(item.type) ?? { type: item.type }),
      sectionOrder: undefined,
    };
  };

  const previewStore: Store = {
    ...liveContextStore,
    name: storeName,
    primaryColor,
    design: {
      ...liveContextStore.design,
      tagline,
      heroTitle,
      heroSubtitle,
      ctaText,
      promoBar: promoBar || undefined,
      accentColor,
      brandStory: brandStory || undefined,
      features,
      testimonials,
      faq: faq.length ? faq : undefined,
      newsletter: newsletter.headline ? newsletter : undefined,
      navLinks,
      trustBadges,
      stats,
      sectionHeadings,
      footerNote: footerNote || undefined,
      sectionOrder: sectionItems.map(i => i.type),
      // Override section order when designTokens exist
      ...(liveContextStore.design?.designTokens ? {
        designTokens: buildReorderedDesignTokens(),
      } : {}),
    } as StoreDesign,
  };

  // ── Section scroll-to from sidebar ───────────────────────────────────────

  const previewRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((sectionType: string) => {
    const el = previewRef.current?.querySelector(`[data-canvas-section="${sectionType}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Save handler ──────────────────────────────────────────────────────────

  const toggle = (key: string) => setOpenSection(s => s === key ? '' : key);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    const newDesign: StoreDesign = {
      ...(liveContextStore.design as StoreDesign),
      tagline, heroTitle, heroSubtitle, ctaText,
      promoBar: promoBar || undefined,
      accentColor,
      brandStory: brandStory || undefined,
      features, testimonials,
      faq: faq.length ? faq : undefined,
      newsletter: newsletter.headline ? newsletter : undefined,
      navLinks,
      trustBadges,
      stats,
      sectionHeadings,
      footerNote: footerNote || undefined,
      sectionOrder: sectionItems.map(i => i.type),
      // Persist reordered sections
      ...(liveContextStore.design?.designTokens ? {
        designTokens: buildReorderedDesignTokens(),
      } : {}),
    };

    updateActiveStore({ name: storeName, primaryColor, design: newDesign });

    if (liveContextStore.status === 'Published') {
      const subdomain = liveContextStore.publishedDomain?.split('.')[0] ?? liveContextStore.domain?.split('.')[0];
      if (subdomain) {
        await fetch('/api/publish-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain, name: storeName, primaryColor,
            category: liveContextStore.category,
            templateId: liveContextStore.template?.id,
            design: newDesign,
            currency: liveContextStore.currency,
            language: liveContextStore.language,
            font: liveContextStore.font,
            mood: liveContextStore.mood,
            audience: liveContextStore.audience,
          }),
        }).catch(console.error);
      }
    }

    setIsSaving(false);
    setSaved(true);

    const previewUrl = `/preview/${liveContextStore.id}`;
    setTimeout(() => router.push(previewUrl), 900);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContextStore, storeName, primaryColor, tagline, heroTitle, heroSubtitle, ctaText,
      promoBar, accentColor, brandStory, features, testimonials, faq, newsletter,
      navLinks, trustBadges, stats, sectionHeadings, footerNote,
      sectionItems, updateActiveStore, isSaving, router]);

  const isPublished = liveContextStore.status === 'Published';
  const storefrontUrl = liveContextStore.publishedDomain
    ? `https://${liveContextStore.publishedDomain}.storee.io`
    : null;
  const backHref = from ?? `/preview/${liveContextStore.id}`;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">

      {/* Inject edit-mode CSS */}
      <EditModeCss active={editMode} />

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm z-10">

        {/* Left — back + store name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push(backHref)}
            title="Back"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Back</span>
          </button>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">{storeName}</span>
          {isPublished
            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">LIVE</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">DRAFT</span>
          }
        </div>

        {/* Center — device switcher + edit/preview toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {([
              { key: 'desktop', Icon: Monitor,    label: 'Desktop' },
              { key: 'tablet',  Icon: Tablet,     label: 'Tablet' },
              { key: 'mobile',  Icon: Smartphone, label: 'Mobile' },
            ] as const).map(({ key, Icon, label }) => (
              <button
                key={key}
                onClick={() => setDevice(key)}
                title={label}
                className={`p-2 rounded-lg transition-all ${device === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Edit / Preview toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setEditMode(false)}
              title="Preview mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!editMode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => setEditMode(true)}
              title="Edit mode — click text in canvas to edit"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${editMode ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Edit2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>

        {/* Right — live link + save */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {storefrontUrl && (
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View live store"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 sm:px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shadow-md"
          >
            {saved
              ? <><Check className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline">Saved</span></>
              : isSaving
              ? <><Save className="w-4 h-4 flex-shrink-0 animate-pulse" /><span className="hidden sm:inline">Saving…</span></>
              : <><Save className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline">Save</span></>
            }
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">

          {/* Sidebar tab switcher */}
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {([
              { key: 'sections',   label: 'Sections',   Icon: Layout },
              { key: 'properties', label: 'Properties', Icon: Sparkles },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setSidebarTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  sidebarTab === key
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Sections panel */}
          <AnimatePresence initial={false} mode="wait">
            {sidebarTab === 'sections' ? (
              <motion.div
                key="sections-panel"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto"
                layoutScroll
              >
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Drag or use ↑↓ to reorder</p>
                </div>
                <Reorder.Group
                  axis="y"
                  values={sectionItems}
                  onReorder={setSectionItems}
                  className="px-3 pb-4 space-y-1.5"
                  as="div"
                  style={{ position: 'relative' }}
                >
                  {sectionItems.map((item, idx) => {
                    const meta = SECTION_META[item.type];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    const moveUp = () => setSectionItems(prev => {
                      if (idx === 0) return prev;
                      const next = [...prev];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      return next;
                    });
                    const moveDown = () => setSectionItems(prev => {
                      if (idx === prev.length - 1) return prev;
                      const next = [...prev];
                      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                      return next;
                    });
                    return (
                      <Reorder.Item
                        key={item.type}
                        value={item}
                        as="div"
                        dragMomentum={false}
                        dragElastic={0}
                        layout
                        transition={{ type: 'spring', stiffness: 600, damping: 35, mass: 0.5 }}
                        onDragStart={() => setDraggingType(item.type)}
                        onDragEnd={() => setDraggingType(null)}
                        style={{
                          position: 'relative',
                          zIndex: draggingType === item.type ? 50 : 'auto',
                          boxShadow: draggingType === item.type ? '0 8px 20px rgba(0,0,0,0.13)' : 'none',
                          scale: draggingType === item.type ? 1.02 : 1,
                          transition: draggingType === item.type ? 'none' : 'box-shadow 0.15s ease, scale 0.15s ease',
                        }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-default ${
                          item.hasContent
                            ? 'bg-white border-slate-200 hover:border-emerald-300'
                            : 'bg-slate-50 border-slate-100 opacity-50'
                        }`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: item.hasContent ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)' }}
                        >
                          <Icon className="w-3 h-3" style={{ color: item.hasContent ? '#10b981' : '#94a3b8' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 truncate">{meta.label}</p>
                          {editMode && item.hasContent && (
                            <p className="text-[10px] text-slate-400 truncate">{meta.editHint}</p>
                          )}
                        </div>
                        {/* ↑↓ step buttons */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0" onPointerDown={e => e.stopPropagation()}>
                          <button
                            onClick={moveUp}
                            disabled={idx === 0}
                            title="Move up"
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={moveDown}
                            disabled={idx === sectionItems.length - 1}
                            title="Move down"
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        {item.hasContent ? (
                          <button
                            onClick={() => scrollToSection(item.type)}
                            title="Scroll to section"
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors flex-shrink-0"
                            onPointerDown={e => e.stopPropagation()}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-300 font-medium flex-shrink-0">empty</span>
                        )}
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                {/* Edit mode callout */}
                {!editMode && (
                  <div className="mx-4 mt-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Switch to <strong>Edit mode</strong> to click text in the preview and edit it inline.
                    </p>
                    <button
                      onClick={() => setEditMode(true)}
                      className="mt-2 w-full py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      Enable Edit Mode
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="properties-panel"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto"
              >
                <Section icon={Layers} title="General" open={openSection === 'general'} onToggle={() => toggle('general')}>
                  <Field label="Store Name"><Input value={storeName} onChange={setStoreName} placeholder="My Store" /></Field>
                  <Field label="Tagline"><Input value={tagline} onChange={setTagline} placeholder="Short brand tagline" /></Field>
                  <Field label="Primary Color"><ColorInput value={primaryColor} onChange={setPrimaryColor} /></Field>
                  <Field label="Accent Color"><ColorInput value={accentColor} onChange={setAccentColor} /></Field>
                </Section>

                <Section icon={Megaphone} title="Promo Bar" open={openSection === 'promoBar'} onToggle={() => toggle('promoBar')}>
                  <Field label="Announcement">
                    <Input value={promoBar} onChange={setPromoBar} placeholder="🎉 Free shipping on orders over $50!" />
                  </Field>
                  <p className="text-xs text-slate-400">Leave empty to hide.</p>
                </Section>

                <Section icon={Type} title="Hero Section" open={openSection === 'hero'} onToggle={() => toggle('hero')}>
                  <Field label="Headline"><Textarea value={heroTitle} onChange={setHeroTitle} placeholder="Your bold headline" rows={2} /></Field>
                  <Field label="Subheadline"><Textarea value={heroSubtitle} onChange={setHeroSubtitle} placeholder="Supporting description" rows={3} /></Field>
                  <Field label="CTA Button"><Input value={ctaText} onChange={setCtaText} placeholder="Shop Now" /></Field>
                </Section>

                <Section icon={Sparkles} title="Features" open={openSection === 'features'} onToggle={() => toggle('features')}>
                  {features.map((f, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label={`Title ${i + 1}`}><Input value={f.title} onChange={v => setFeatures(features.map((x, idx) => idx === i ? { ...x, title: v } : x))} /></Field>
                      <Field label="Description"><Textarea value={f.description} onChange={v => setFeatures(features.map((x, idx) => idx === i ? { ...x, description: v } : x))} rows={2} /></Field>
                    </div>
                  ))}
                  <button onClick={() => setFeatures([...features, { icon: '✨', title: '', description: '' }])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Feature
                  </button>
                </Section>

                <Section icon={Star} title="Testimonials" open={openSection === 'testimonials'} onToggle={() => toggle('testimonials')}>
                  {testimonials.map((t, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setTestimonials(testimonials.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label="Review"><Textarea value={t.text} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, text: v } : x))} rows={2} /></Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Author"><Input value={t.author} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, author: v } : x))} /></Field>
                        <Field label="Role"><Input value={t.role} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, role: v } : x))} /></Field>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setTestimonials([...testimonials, { text: '', author: '', role: '', rating: 5 }])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Testimonial
                  </button>
                </Section>

                <Section icon={HelpCircle} title="FAQ" open={openSection === 'faq'} onToggle={() => toggle('faq')}>
                  {faq.map((item, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setFaq(faq.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label="Question"><Input value={item.q} onChange={v => setFaq(faq.map((x, idx) => idx === i ? { ...x, q: v } : x))} /></Field>
                      <Field label="Answer"><Textarea value={item.a} onChange={v => setFaq(faq.map((x, idx) => idx === i ? { ...x, a: v } : x))} rows={2} /></Field>
                    </div>
                  ))}
                  <button onClick={() => setFaq([...faq, { q: '', a: '' }])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add FAQ
                  </button>
                </Section>

                <Section icon={Mail} title="Newsletter" open={openSection === 'newsletter'} onToggle={() => toggle('newsletter')}>
                  <Field label="Headline"><Input value={newsletter.headline} onChange={v => setNewsletter(n => ({ ...n, headline: v }))} placeholder="Stay in the loop" /></Field>
                  <Field label="Subtext"><Textarea value={newsletter.subtext} onChange={v => setNewsletter(n => ({ ...n, subtext: v }))} placeholder="Subscribe for exclusive deals…" rows={2} /></Field>
                  <p className="text-xs text-slate-400">Leave headline empty to hide.</p>
                </Section>

                <Section icon={BookOpen} title="Brand Story" open={openSection === 'brandStory'} onToggle={() => toggle('brandStory')}>
                  <Field label="Story"><Textarea value={brandStory} onChange={setBrandStory} placeholder="Tell your brand's story…" rows={5} /></Field>
                  <p className="text-xs text-slate-400">Leave empty to hide.</p>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom hint */}
          {isPublished && (
            <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
              <p className="text-[10px] text-slate-400 text-center">Save syncs changes to your live store</p>
            </div>
          )}
        </aside>

        {/* ── Preview area ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden bg-slate-100 flex justify-center">
          {/* Edit mode hint bar */}
          <AnimatePresence>
            {editMode && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-[68px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-lg pointer-events-none"
              >
                <MousePointer className="w-3.5 h-3.5" />
                Click any text in the preview to edit it directly
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={`bg-white shadow-xl overflow-hidden transition-all duration-300 flex flex-col ${editMode ? 'ring-2 ring-emerald-400/40' : ''}`}
            style={{
              // Width is derived from aspect ratio so the frame fills the full canvas height
              width:
                device === 'mobile'  ? 'calc((100vh - 57px) * 390 / 844)' :
                device === 'tablet'  ? 'calc((100vh - 57px) * 768 / 1024)' :
                '100%',
              minWidth: device === 'desktop' ? 960 : undefined,
            }}
          >
            {/* Content viewport — fills full canvas height, scrolls inside */}
            <div
              ref={previewRef}
              style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                // transform contains position:fixed descendants inside the frame
                transform: 'translateZ(0)',
                height: 'calc(100vh - 57px)',
              }}
            >
              <StorePreview store={previewStore} device={device} editMode={editMode} onFieldChange={handleFieldChange} />
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
