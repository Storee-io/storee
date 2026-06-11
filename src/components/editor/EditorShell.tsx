'use client';

import { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Monitor, Tablet, Smartphone, ChevronDown, ChevronRight, ChevronUp,
  Check, Rocket, ArrowLeft, Sparkles, Mail,
  BookOpen, Megaphone, Layers, Plus, Trash2,
  Star, HelpCircle, Type, Eye, Lock,
  Edit2, GripVertical, MousePointer, MousePointerClick, Layout, Pencil,
  LayoutDashboard, Undo2, Redo2, History, Compass,
} from 'lucide-react';
import { useHistory } from '../../hooks/useHistory';
import HistoryPanel from './HistoryPanel';
import { useStore } from '../../context/StoreContext';
import { CartProvider } from '../../context/CartContext';
import { WishlistProvider } from '../../context/WishlistContext';
const StorePreview = lazy(() => import('../preview/StorePreview'));
import PublishModal from '../preview/PublishModal';
import type { Store } from '../../context/StoreContext';
import type { StoreDesign } from '../../lib/claudeApi';
import { toast } from 'sonner';
import { Tip } from '@/components/ui/tip';
import { FloatingToolbar } from './FloatingToolbar';
import ElementOverlay, { type ElementStyleOverride } from './ElementOverlay';

type Device = 'desktop' | 'tablet' | 'mobile';

// â"€â"€ Section metadata â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// Legacy layouts (no designTokens) only support reordering these sections via design.sectionOrder.
// hero/trust/collections/products are hardcoded at the top of each legacy layout.
const LEGACY_REORDERABLE_SECTIONS = new Set(['features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter']);

// Sections that specific layout types don't render at all — hide them from the editor panel.
const LAYOUT_TYPE_UNSUPPORTED: Record<string, Set<string>> = {
  'app-like': new Set(['hero', 'stats', 'faq', 'newsletter']),
};

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
    return `${section} ${idx} - ${key.charAt(0).toUpperCase() + key.slice(1)}`;
  }
  return field;
}

// â"€â"€ Shared form primitives â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, dataField }: { value: string; onChange: (v: string) => void; placeholder?: string; dataField?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      data-field={dataField}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white transition-all placeholder:text-slate-300"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, dataField }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; dataField?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      data-field={dataField}
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

// â"€â"€ Section item with drag handle â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface SectionItem {
  type: string;
  hasContent: boolean;
}

function sectionHasContent(type: string, design: StoreDesign | undefined): boolean {
  if (!design) return false;
  switch (type) {
    // Legacy layouts always render hero hardcoded; token layouts only render if data exists.
    case 'hero':         return (!design.designTokens && !design.designSystem) || !!design.heroTitle || !!design.heroSubtitle;
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
  // Only include section types the editor knows about (have SECTION_META entries).
  // Unknown types (e.g. scrollingBanner, editorialBanner) are invisible in the sidebar
  // and cause Move Up/Down and drag to appear broken (swapping with invisible items).
  const layoutType = dt?.layoutType as string | undefined ?? '';
  const unsupported = LAYOUT_TYPE_UNSUPPORTED[layoutType] ?? new Set<string>();
  return order
    .filter(type => type in SECTION_META)
    .filter(type => !unsupported.has(type))
    .map(type => ({ type, hasContent: sectionHasContent(type, design) }));
}

// â"€â"€ Edit mode CSS injector â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function EditModeCss({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <style>{`
      [data-editor-field] {
        cursor: text !important;
        border-radius: 2px;
        transition: box-shadow 0.12s ease;
        line-height: 1 !important;
        vertical-align: middle;
      }
      [data-editor-field]:hover {
        box-shadow: inset 0 0 0 2px #10b981 !important;
      }
      [data-editor-field]:focus,
      [data-editor-field][data-ce] {
        box-shadow: inset 0 0 0 2px #059669 !important;
        background: rgba(16, 185, 129, 0.06) !important;
      }
    `}</style>
  );
}

// â"€â"€ Main â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface Props {
  store: Store;
  from?: string | null;
}

export default function EditorShell({ store, from }: Props) {
  const { updateActiveStore, activeStore, setActiveStore, addStore } = useStore();
  const router = useRouter();
  const [device, setDevice] = useState<Device>('desktop');
  const [openSection, setOpenSection] = useState<string>('hero');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'sections' | 'properties'>('sections');
  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [canvasPage, setCanvasPage] = useState<string>('/');
  const canvasNavigateRef = useRef<((path: string) => void) | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef(true);
  const persistStoreRef = useRef<(() => Promise<void>) | null>(null);

  // Live store from props (URL param is source of truth for this editor page)
  // Don't fall back to activeStore from context, as it might be a different store
  const liveContextStore = store;
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

  // Element size overrides from drag-resize (persisted in design.elementOverrides)
  // Also backed up to localStorage to prevent loss on reload
  const [elementOverrides, setElementOverrides] = useState<Record<string, ElementStyleOverride>>(() => {
    // Try to restore from design data first
    if (d?.elementOverrides) return d.elementOverrides;

    // Fallback to localStorage backup
    try {
      const stored = localStorage.getItem(`editor_overrides_${liveContextStore.id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Section order for drag reorder
  const [sectionItems, setSectionItems] = useState<SectionItem[]>(() => deriveInitialSections(d));

  // Backup elementOverrides to localStorage on every change
  useEffect(() => {
    if (Object.keys(elementOverrides).length > 0) {
      try {
        localStorage.setItem(`editor_overrides_${liveContextStore.id}`, JSON.stringify(elementOverrides));
      } catch {
        // localStorage full or unavailable - silently fail
      }
    }
  }, [elementOverrides, liveContextStore.id]);

  // History panel open state
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const historyBtnRef = useRef<HTMLButtonElement>(null);

  // History (undo/redo)
  const {
    canUndo,
    canRedo,
    currentSnapshot,
    snapshots: historySnapshots,
    currentIndex: historyCurrentIndex,
    undo: historyUndo,
    redo: historyRedo,
    goToVersion: historyGoToVersion,
    pushSnapshot,
  } = useHistory(
    {
      heroTitle,
      heroSubtitle,
      ctaText,
      promoBar,
      accentColor,
      brandStory,
      features,
      testimonials,
      faq,
      newsletter,
      navLinks,
      trustBadges,
      stats,
      sectionHeadings,
      footerNote,
      tagline,
      sectionOrder: sectionItems.map(i => i.type),
    } as StoreDesign,
    store.id,
    storeName,
    primaryColor
  );

  // Restore state when undo/redo changes currentSnapshot
  useEffect(() => {
    if (!currentSnapshot) return;

    const design = currentSnapshot.design;

    // Check if design fields changed
    const currentDesign = {
      heroTitle, heroSubtitle, ctaText, promoBar, accentColor, brandStory,
      features, testimonials, faq, newsletter, navLinks, trustBadges,
      stats, sectionHeadings, footerNote, tagline,
      sectionOrder: sectionItems.map(i => i.type),
    };
    const snapshotDesign = {
      heroTitle: design.heroTitle, heroSubtitle: design.heroSubtitle,
      ctaText: design.ctaText, promoBar: design.promoBar, accentColor: design.accentColor,
      brandStory: design.brandStory, features: design.features, testimonials: design.testimonials,
      faq: design.faq, newsletter: design.newsletter, navLinks: design.navLinks,
      trustBadges: design.trustBadges, stats: design.stats, sectionHeadings: design.sectionHeadings,
      footerNote: design.footerNote, tagline: design.tagline, sectionOrder: design.sectionOrder,
    };

    if (JSON.stringify(currentDesign) !== JSON.stringify(snapshotDesign)) {
      // Restore all design fields
      setHeroTitle(design.heroTitle ?? '');
      setHeroSubtitle(design.heroSubtitle ?? '');
      setCtaText(design.ctaText ?? '');
      setPromoBar(design.promoBar ?? '');
      setAccentColor(design.accentColor ?? '#06b6d4');
      setBrandStory(design.brandStory ?? '');
      setFeatures(design.features ?? []);
      setTestimonials(design.testimonials ?? []);
      setFaq(design.faq ?? []);
      setNewsletter(design.newsletter ?? { headline: '', subtext: '' });
      setNavLinks(design.navLinks ?? []);
      setTrustBadges(design.trustBadges ?? []);
      setStats(design.stats ?? []);
      setSectionHeadings(design.sectionHeadings ?? {});
      setFooterNote(design.footerNote ?? '');
      setTagline(design.tagline ?? '');

      // Restore section order
      if (design.sectionOrder?.length) {
        setSectionItems(prev => {
          const itemMap = Object.fromEntries(prev.map(item => [item.type, item]));
          const ordered = design.sectionOrder!
            .filter((type: string) => itemMap[type])
            .map((type: string) => itemMap[type]);
          const missing = prev.filter(item => !design.sectionOrder!.includes(item.type));
          return [...ordered, ...missing];
        });
      }
    }

    // Restore element overrides (resize history)
    const snapshotOverrides = design.elementOverrides ?? {};
    if (JSON.stringify(snapshotOverrides) !== JSON.stringify(elementOverrides)) {
      setElementOverrides(snapshotOverrides);
      // Also clear inline styles that no longer exist in the restored snapshot
      // (ElementOverlay's useEffect will re-apply the correct ones from the new state)
    }

    // Restore store name
    if (currentSnapshot.storeName !== undefined && currentSnapshot.storeName !== storeName) {
      setStoreName(currentSnapshot.storeName);
    }

    // Restore primary color
    if (currentSnapshot.primaryColor !== undefined && currentSnapshot.primaryColor !== primaryColor) {
      setPrimaryColor(currentSnapshot.primaryColor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnapshot]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) historyUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) historyRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, historyUndo, historyRedo]);

  // Ensure activeStore in context always points to THIS store.
  // Without this, activeStore may still be a different store (e.g. sorted[0] from
  // the dashboard), and updateActiveStore would patch + persist the WRONG store.
  useEffect(() => {
    if (activeStore?.id !== store.id) {
      setActiveStore(store);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id]);

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
    setElementOverrides(ds?.elementOverrides ?? {});
    setSectionItems(deriveInitialSections(ds));
  // Only re-sync when the active store ID changes (switching stores).
  // Do NOT include liveContextStore.design — it creates a new reference every render
  // (StoreContext re-creates objects), which would reset sectionItems and other local
  // edits on every render cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContextStore.id]);

  // â"€â"€ onFieldChange handler (called from canvas contenteditable) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const handleFieldPositionChange = useCallback((field: string, offset: { x: number; y: number }) => {
    // Disabled - drag-to-move causes section unmount issues, needs further investigation
    console.log('Field position change:', field, offset);
  }, [updateActiveStore, pushSnapshot]);

  const handleElementOverride = useCallback((selector: string, styles: ElementStyleOverride) => {
    setElementOverrides(prev => ({ ...prev, [selector]: styles }));
    // Trigger autosave by signalling dirty (setIsDirty is triggered via the useEffect deps below)
    setIsDirty(true);
    setSaved(false);
  }, []);

  const handleTextElementSelected = useCallback((fieldName: string | null) => {
    if (!fieldName) return;

    // Switch to Properties tab
    setSidebarTab('properties');

    // Parse field name (could be "heroTitle" or "features.0.title")
    const isArrayField = fieldName.includes('.');
    const sectionMap: Record<string, string> = {
      'tagline': 'general',
      'storeName': 'general',
      'navLinks': 'navigation',
      'heroTitle': 'hero',
      'heroSubtitle': 'hero',
      'ctaText': 'hero',
      'promoBar': 'promoBar',
      'brandStory': 'brandStory',
      'newsletter': 'newsletter',
      'features': 'features',
      'testimonials': 'testimonials',
      'trustBadges': 'trust',
      'stats': 'stats',
      'faq': 'faq',
      'collections': 'collections',
      'products': 'products',
      'sectionHeadings': 'features', // default, overridden below
    };

    // Determine which section to open
    let section = 'general';
    // Exact match first
    if (sectionMap[fieldName]) {
      section = sectionMap[fieldName];
    } else {
      // Prefix match for array fields and dotted fields
      for (const [key, val] of Object.entries(sectionMap)) {
        if (fieldName.startsWith(key)) {
          section = val;
          break;
        }
      }
    }
    // Special: sectionHeadings.X → open that section
    const shMatch = fieldName.match(/^sectionHeadings\.(\w+)$/);
    if (shMatch) section = shMatch[1];

    setOpenSection(section);

    // Auto-focus by data-field attribute — wait for React re-render + section animation
    const focusField = (fieldName: string) => {
      const input = document.querySelector(
        `[data-field="${fieldName}"]`
      ) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input && input.offsetParent !== null) { // Check element is visible
        input.focus();
        input.select?.();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    };

    // Use requestAnimationFrame + setTimeout for reliable timing after state update
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (!focusField(fieldName)) {
          // Retry multiple times with increasing delays
          setTimeout(() => focusField(fieldName), 100);
          setTimeout(() => focusField(fieldName), 300);
          setTimeout(() => focusField(fieldName), 600);
        }
      }, 100);
    });
  }, []);

  const handleArrayReorder = useCallback((field: string, newItems: unknown[]) => {
    if (field === 'testimonials') {
      setTestimonials(newItems as typeof testimonials);
    } else if (field === 'features') {
      setFeatures(newItems as typeof features);
    } else if (field === 'trustBadges') {
      setTrustBadges(newItems as typeof trustBadges);
    } else if (field === 'stats') {
      setStats(newItems as typeof stats);
    } else if (field === 'faq') {
      setFaq(newItems as typeof faq);
    }
    // Snapshot is taken by autosave - no explicit push needed here
  }, [testimonials, features, trustBadges, stats, faq]);

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

  // â"€â"€ Build preview store â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  // Legacy layout = no designTokens/designSystem at all.
  // Token-based layouts (MasonryLayout etc.) now have all sections in their sectionMap
  // and render fully via sectionOrder — no sections are locked for those stores.
  const isLegacyLayout = !liveContextStore.design?.designTokens && !liveContextStore.design?.designSystem;

  // Build sections array from current drag order (for designTokens stores)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildReorderedDesignTokens = (): any => {
    const dt = liveContextStore.design?.designTokens;
    if (!dt) return dt;
    // Preserve variant/props per section from the original
    const srcSections = (dt.sections ?? []) as Array<{ type: string; variant?: string; props?: unknown }>;
    const srcMap = new Map(srcSections.map(s => [s.type, s]));
    const result = {
      ...dt,
      sections: sectionItems.map(item => srcMap.get(item.type) ?? { type: item.type }),
    };
    return result;
  };

  // For legacy layouts, only pass the sections that are actually inside the sectionMap.
  // hero/trust/collections/products are hardcoded at the top of each legacy layout and
  // can't be reordered via sectionOrder — passing them causes null renders in the sectionMap.
  const effectiveSectionOrder = isLegacyLayout
    ? sectionItems.map(i => i.type).filter(t => LEGACY_REORDERABLE_SECTIONS.has(t))
    : sectionItems.map(i => i.type);

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
      sectionOrder: effectiveSectionOrder,
      elementOverrides: Object.keys(elementOverrides).length ? elementOverrides : undefined,
      // Override section order when designTokens exist
      ...(liveContextStore.design?.designTokens ? {
        designTokens: buildReorderedDesignTokens(),
      } : {}),
    } as StoreDesign,
  };

  // â"€â"€ Section scroll-to from sidebar â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const previewRef = useRef<HTMLDivElement>(null);

  // Sidebar resize
  const SIDEBAR_MIN = 200;
  const SIDEBAR_MAX = 480;
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);


  // ── Edit hint (shown when user tries to interact without edit mode) ──────────
  const [showEditHint, setShowEditHint] = useState(false);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const editHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);

  const triggerEditHint = useCallback(() => {
    if (editMode) return;
    setShowEditHint(true);
    if (editHintTimerRef.current) clearTimeout(editHintTimerRef.current);
    editHintTimerRef.current = setTimeout(() => setShowEditHint(false), 3500);
  }, [editMode]);

  useEffect(() => () => {
    if (editHintTimerRef.current) clearTimeout(editHintTimerRef.current);
  }, []);

  // Sidebar resize mouse handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const delta = e.clientX - resizeStartX.current;
      const newW = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, resizeStartW.current + delta));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      if (!isResizingSidebar) return;
      setIsResizingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizingSidebar]);

  const scrollToSection = useCallback((sectionType: string) => {
    const el = previewRef.current?.querySelector(`[data-editor-section="${sectionType}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // â"€â"€ Save handler â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const toggle = (key: string) => setOpenSection(s => s === key ? '' : key);

  // â"€â"€ Core save (no toast, no navigate) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const persistStore = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setIsDirty(false);

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
      sectionOrder: effectiveSectionOrder,
      elementOverrides: Object.keys(elementOverrides).length ? elementOverrides : undefined,
      ...(liveContextStore.design?.designTokens ? {
        designTokens: buildReorderedDesignTokens(),
      } : {}),
    };

    updateActiveStore({ name: storeName, primaryColor, design: newDesign });

    // NOTE: Auto-sync to published store removed. Updates now only happen via explicit
    // "Publish Changes" click in PublishModal, not real-time during editor changes.

    setIsSaving(false);
    setSaved(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContextStore, storeName, primaryColor, tagline, heroTitle, heroSubtitle, ctaText,
      promoBar, accentColor, brandStory, features, testimonials, faq, newsletter,
      navLinks, trustBadges, stats, sectionHeadings, footerNote,
      sectionItems, elementOverrides, updateActiveStore, isSaving]);

  // Keep ref in sync so autosave always calls the latest version
  persistStoreRef.current = persistStore;

  // â"€â"€ Manual save (persist + toast + navigate back to preview) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const handleSave = useCallback(async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    await persistStore();
    toast.success('Changes saved!', {
      description: liveContextStore.status === 'Published' ? 'Live store has been updated.' : 'Returning to preview…',
    });
    const previewUrl = `/preview/${liveContextStore.id}`;
    setTimeout(() => router.push(previewUrl), 900);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistStore, liveContextStore.id, liveContextStore.status, router]);

  // â"€â"€ Autosave: debounce 2.5s on any design change + push to history â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    // Skip the very first render (initial state from store data)
    if (isInitialMountRef.current) { isInitialMountRef.current = false; return; }

    setIsDirty(true);
    setSaved(false);
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistStoreRef.current?.();
      // Push to history after successful save
      const currentDesign = {
        heroTitle,
        heroSubtitle,
        ctaText,
        promoBar,
        accentColor,
        brandStory,
        features,
        testimonials,
        faq,
        newsletter,
        navLinks,
        trustBadges,
        stats,
        sectionHeadings,
        footerNote,
        tagline,
        sectionOrder: sectionItems.map(i => i.type),
        elementOverrides: Object.keys(elementOverrides).length ? elementOverrides : undefined,
      } as StoreDesign;
      pushSnapshot(currentDesign, storeName, primaryColor);
    }, 5000);

    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeName, primaryColor, tagline, heroTitle, heroSubtitle, ctaText,
      promoBar, accentColor, brandStory, features, testimonials, faq, newsletter,
      navLinks, trustBadges, stats, sectionHeadings, footerNote, sectionItems,
      elementOverrides, pushSnapshot]);

  const handlePublishComplete = useCallback((subdomain: string) => {
    const publishedDomain = liveContextStore.publishedDomain ?? subdomain.replace('.storee.io', '');
    updateActiveStore({
      status: 'Published',
      domain: subdomain,
      publishedDomain,
    });
    // addStore ensures the store appears in My Stores even if it wasn't in the array yet
    addStore({
      ...liveContextStore,
      status: 'Published',
      domain: subdomain,
      publishedDomain,
    }).catch(console.error);
    setShowPublishModal(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateActiveStore, addStore, liveContextStore]);

  const isPublished = liveContextStore.status === 'Published';
  const hasPublishedBefore = !!liveContextStore.publishedDomain;
  const storefrontUrl = liveContextStore.publishedDomain
    ? `https://${liveContextStore.publishedDomain}.storee.io`
    : null;
  const backHref = from ?? `/preview/${liveContextStore.id}`;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', colorScheme: 'light' }}>

      {/* Force touch-action:none on Reorder items so Framer Motion drag works inside
          an overflow-y:auto scroll container. FM sets pan-x internally via inline style
          but !important from a <style> tag overrides it. */}
      <style>{`.section-reorder-item{touch-action:none!important}`}</style>

      {/* Inject edit-mode CSS */}
      <EditModeCss active={editMode} />

      {/* â"€â"€ Top bar â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 h-12 flex items-center gap-3 flex-shrink-0 z-10" style={{ isolation: 'isolate', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>

        {/* Left — back + store name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Tip label="Back to Preview">
            <button
              onClick={() => { toast('Going back...', { duration: 1200 }); router.push(backHref); }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Tip>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base truncate">{storeName}</span>
          {isPublished
            ? <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                Live
              </button>
            : <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                Draft
              </span>
          }

          {/* Edit toggle */}
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <Tip label={editMode ? 'Exit edit mode' : 'Click text to edit inline'}>
            <button
              ref={editBtnRef}
              onClick={() => { setEditMode(v => !v); setShowEditHint(false); }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl transition-all ${editMode ? 'bg-blue-100 text-blue-600' : showEditHint ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-400 ring-offset-1' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </Tip>

          {/* Undo/Redo + History buttons */}
          <div className="flex items-center gap-0.5 ml-1">
            <Tip label="Undo (Ctrl+Z)">
              <button
                onClick={historyUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label="Redo (Ctrl+Shift+Z)">
              <button
                onClick={historyRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-lg transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label="Version history">
              <div className="relative">
                <button
                  ref={historyBtnRef}
                  onClick={() => setShowHistoryPanel(v => !v)}
                  className={`p-1.5 rounded-lg transition-all ${showHistoryPanel ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <History className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {showHistoryPanel && (
                    <HistoryPanel
                      snapshots={historySnapshots}
                      currentIndex={historyCurrentIndex}
                      onRevert={(idx) => { historyGoToVersion(idx); setShowHistoryPanel(false); }}
                      onClose={() => setShowHistoryPanel(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </Tip>
          </div>
        </div>

        {/* Center — device switcher (truly centered) */}
        <div className="flex items-center flex-shrink-0">
          <div className="flex items-center bg-slate-100 rounded-xl h-8 px-[3px] gap-0.5">
            {([
              { key: 'desktop', Icon: Monitor,    label: 'Desktop' },
              { key: 'tablet',  Icon: Tablet,     label: 'Tablet' },
              { key: 'mobile',  Icon: Smartphone, label: 'Mobile' },
            ] as const).map(({ key, Icon, label }) => (
              <Tip key={key} label={label}>
                <button
                  onClick={() => setDevice(key)}
                  className={`p-1.5 rounded-lg transition-all ${device === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              </Tip>
            ))}
          </div>
        </div>

        {/* Right — autosave status + Preview + Publish */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {/* Autosave status indicator */}
          <span className="hidden sm:inline text-xs transition-all">
            {isSaving
              ? <span className="text-slate-400">Saving…</span>
              : saved && !isDirty
              ? <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>
              : isDirty
              ? <span className="text-slate-400">Unsaved…</span>
              : null
            }
          </span>

          {/* Preview */}
          <button
            onClick={() => router.push(`/preview/${liveContextStore.id}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          {/* Publish — unified button for first publish & updates */}
          <Tip label={isPublished ? 'Publish changes to live store' : 'Make your store live'}>
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 gradient-bg text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              <Rocket className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </Tip>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0" />

          {/* Dashboard */}
          <Tip label="Go to Dashboard">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </Tip>
        </div>
      </div>

      {/* â"€â"€ Body â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <aside
          className="flex-shrink-0 bg-white flex flex-col overflow-hidden"
          style={{
            width: sidebarWidth,
            isolation: 'isolate',
            boxShadow: '1px 0 2px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
        >

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

          {/* Non-home page state */}
          {canvasPage !== '/' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  {canvasPage.startsWith('/product') ? 'Product Page'
                    : canvasPage === '/cart' ? 'Cart Page'
                    : canvasPage === '/checkout' ? 'Checkout Page'
                    : canvasPage === '/wishlist' ? 'Wishlist Page'
                    : canvasPage === '/my-orders' ? 'My Orders Page'
                    : canvasPage}
                </p>
                <p className="text-xs text-slate-400">Sections & Properties are only editable on the Home page.</p>
              </div>
              <button
                onClick={() => { canvasNavigateRef.current?.('/'); setCanvasPage('/'); }}
                className="px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all gradient-bg hover:opacity-90"
              >
                ← Back to Home
              </button>
            </div>
          )}

          {/* Sections panel */}
          <AnimatePresence initial={false} mode="wait">
            {canvasPage === '/' && sidebarTab === 'sections' ? (
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
                    if (!item.hasContent) return null;
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
                    const isLocked = isLegacyLayout && !LEGACY_REORDERABLE_SECTIONS.has(item.type);
                    return (
                      <Reorder.Item
                        key={item.type}
                        value={item}
                        as="div"
                        layout={isResizingSidebar ? undefined : 'position'}
                        dragListener={!isLocked}
                        onDragStart={isLocked ? undefined : () => setDraggingType(item.type)}
                        onDragEnd={isLocked ? undefined : () => setDraggingType(null)}
                        style={{
                          position: 'relative',
                          zIndex: draggingType === item.type ? 50 : undefined,
                          boxShadow: draggingType === item.type ? '0 8px 20px rgba(0,0,0,0.13)' : 'none',
                          touchAction: 'none',
                        }}
                        className={`section-reorder-item flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
                          isLocked
                            ? 'cursor-default bg-slate-50 border-slate-100'
                            : item.hasContent
                              ? 'cursor-grab active:cursor-grabbing bg-white border-slate-200 hover:border-emerald-300'
                              : 'cursor-grab active:cursor-grabbing bg-slate-50 border-slate-100 opacity-50'
                        }`}
                      >
                        {isLocked
                          ? <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                          : <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        }
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: isLocked ? 'rgba(148,163,184,0.08)' : item.hasContent ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)' }}
                        >
                          <Icon className="w-3 h-3" style={{ color: isLocked ? '#cbd5e1' : item.hasContent ? '#10b981' : '#94a3b8' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isLocked ? 'text-slate-400' : 'text-slate-700'}`}>{meta.label}</p>
                          {isLocked
                            ? <p className="text-[10px] text-slate-300 truncate">Fixed position</p>
                            : item.hasContent && <p className="text-[10px] text-slate-400 truncate">{meta.editHint}</p>
                          }
                        </div>
                        {/* ↑↓ step buttons — hidden for locked sections */}
                        {!isLocked && (
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
                        )}
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
                          !isLocked && <span className="text-[9px] text-slate-300 font-medium flex-shrink-0">empty</span>
                        )}
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

              </motion.div>
            ) : canvasPage === '/' ? (
              <motion.div
                key="properties-panel"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto"
              >
                <Section icon={Layers} title="General" open={openSection === 'general'} onToggle={() => toggle('general')}>
                  <Field label="Store Name"><Input value={storeName} onChange={setStoreName} placeholder="My Store" dataField="storeName" /></Field>
                  <Field label="Tagline"><Input value={tagline} onChange={setTagline} placeholder="Short brand tagline" dataField="tagline" /></Field>
                  <Field label="Primary Color"><ColorInput value={primaryColor} onChange={setPrimaryColor} /></Field>
                  <Field label="Accent Color"><ColorInput value={accentColor} onChange={setAccentColor} /></Field>
                </Section>

                <Section icon={Compass} title="Navigation" open={openSection === 'navigation'} onToggle={() => toggle('navigation')}>
                  {navLinks.map((link, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setNavLinks(navLinks.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label={`Link ${i + 1}`}><Input value={link} onChange={v => setNavLinks(navLinks.map((x, idx) => idx === i ? v : x))} placeholder="e.g., Catalog" dataField={`navLinks.${i}`} /></Field>
                    </div>
                  ))}
                  <button onClick={() => setNavLinks([...navLinks, ''])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Link
                  </button>
                </Section>

                <Section icon={Megaphone} title="Promo Bar" open={openSection === 'promoBar'} onToggle={() => toggle('promoBar')}>
                  <Field label="Announcement">
                    <Input value={promoBar} onChange={setPromoBar} placeholder="ðŸŽ‰ Free shipping on orders over $50!" dataField="promoBar" />
                  </Field>
                  <p className="text-xs text-slate-400">Leave empty to hide.</p>
                </Section>

                <Section icon={Check} title="Trust Badges" open={openSection === 'trust'} onToggle={() => toggle('trust')}>
                  {trustBadges.map((b, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setTrustBadges(trustBadges.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label={`Badge ${i + 1}`}><Input value={b.text} onChange={v => setTrustBadges(trustBadges.map((x, idx) => idx === i ? { ...x, text: v } : x))} dataField={`trustBadges.${i}.text`} /></Field>
                    </div>
                  ))}
                  <button onClick={() => setTrustBadges([...trustBadges, { icon: 'âœ¢', text: '' }])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Badge
                  </button>
                </Section>

                <Section icon={Type} title="Hero Section" open={openSection === 'hero'} onToggle={() => toggle('hero')}>
                  <Field label="Headline"><Textarea value={heroTitle} onChange={setHeroTitle} placeholder="Your bold headline" rows={2} dataField="heroTitle" /></Field>
                  <Field label="Subheadline"><Textarea value={heroSubtitle} onChange={setHeroSubtitle} placeholder="Supporting description" rows={3} dataField="heroSubtitle" /></Field>
                  <Field label="CTA Button"><Input value={ctaText} onChange={setCtaText} placeholder="Shop Now" dataField="ctaText" /></Field>
                </Section>

                <Section icon={Sparkles} title="Features" open={openSection === 'features'} onToggle={() => toggle('features')}>
                  <Field label="Section Heading"><Input value={sectionHeadings.features ?? ''} onChange={v => setSectionHeadings(h => ({ ...h, features: v }))} placeholder="Why choose us" dataField="sectionHeadings.features" /></Field>
                  {features.map((f, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label={`Title ${i + 1}`}><Input value={f.title} onChange={v => setFeatures(features.map((x, idx) => idx === i ? { ...x, title: v } : x))} dataField={`features.${i}.title`} /></Field>
                      <Field label="Description"><Textarea value={f.description} onChange={v => setFeatures(features.map((x, idx) => idx === i ? { ...x, description: v } : x))} rows={2} dataField={`features.${i}.description`} /></Field>
                    </div>
                  ))}
                  <button onClick={() => setFeatures([...features, { icon: 'âœ¨', title: '', description: '' }])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Feature
                  </button>
                </Section>

                <Section icon={Star} title="Testimonials" open={openSection === 'testimonials'} onToggle={() => toggle('testimonials')}>
                  <Field label="Section Heading"><Input value={sectionHeadings.testimonials ?? ''} onChange={v => setSectionHeadings(h => ({ ...h, testimonials: v }))} placeholder="What our customers say" dataField="sectionHeadings.testimonials" /></Field>
                  {testimonials.map((t, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setTestimonials(testimonials.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label="Review"><Textarea value={t.text} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, text: v } : x))} rows={2} dataField={`testimonials.${i}.text`} /></Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Author"><Input value={t.author} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, author: v } : x))} dataField={`testimonials.${i}.author`} /></Field>
                        <Field label="Role"><Input value={t.role} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, role: v } : x))} dataField={`testimonials.${i}.role`} /></Field>
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
                  <Field label="Headline"><Input value={newsletter.headline} onChange={v => setNewsletter(n => ({ ...n, headline: v }))} placeholder="Stay in the loop" dataField="newsletter.headline" /></Field>
                  <Field label="Subtext"><Textarea value={newsletter.subtext} onChange={v => setNewsletter(n => ({ ...n, subtext: v }))} placeholder="Subscribe for exclusive deals..." rows={2} dataField="newsletter.subtext" /></Field>
                  <p className="text-xs text-slate-400">Leave headline empty to hide.</p>
                </Section>

                <Section icon={BookOpen} title="Brand Story" open={openSection === 'brandStory'} onToggle={() => toggle('brandStory')}>
                  <Field label="Story"><Textarea value={brandStory} onChange={setBrandStory} placeholder="Tell your brand's story..." rows={5} dataField="brandStory" /></Field>
                  <p className="text-xs text-slate-400">Leave empty to hide.</p>
                </Section>

                <Section icon={Type} title="Stats" open={openSection === 'stats'} onToggle={() => toggle('stats')}>
                  {stats.map((s, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2.5 relative group">
                      <button onClick={() => setStats(stats.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Field label={`Stat ${i + 1} Value`}><Input value={s.value} onChange={v => setStats(stats.map((x, idx) => idx === i ? { ...x, value: v } : x))} dataField={`stats.${i}.value`} /></Field>
                      <Field label="Label"><Input value={s.label} onChange={v => setStats(stats.map((x, idx) => idx === i ? { ...x, label: v } : x))} dataField={`stats.${i}.label`} /></Field>
                    </div>
                  ))}
                  <button onClick={() => setStats([...stats, { value: '', label: '' }])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Stat
                  </button>
                </Section>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Bottom hint */}
          {isPublished && (
            <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
              <p className="text-[10px] text-slate-400 text-center">Changes autosave locally. Click 'Publish Changes' to update live store</p>
            </div>
          )}
        </aside>

        {/* ── Sidebar resize handle ──────────────────────────────────────── */}
        <div
          className={`flex-shrink-0 relative group cursor-col-resize transition-all duration-150 ${
            isResizingSidebar ? 'bg-emerald-400' : 'bg-slate-300 hover:bg-emerald-400'
          }`}
          style={{
            width: isResizingSidebar ? '3px' : '1px',
            boxShadow: isResizingSidebar ? 'none' : '3px 0 8px rgba(0, 0, 0, 0.15)'
          }}
          onMouseDown={e => {
            e.preventDefault();
            setIsResizingSidebar(true);
            resizeStartX.current = e.clientX;
            resizeStartW.current = sidebarWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          {/* Wider invisible hit area */}
          <div className="absolute inset-y-0 -left-2 -right-2" />
          {/* Drag dots indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {[0,1,2].map(i => (
              <div key={i} className="w-0.5 h-0.5 rounded-full bg-white" />
            ))}
          </div>
        </div>

        {/* ── Preview area ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden bg-slate-100 flex justify-center">

          {/* Floating text-format toolbar — fixed position, escapes overflow */}
          <FloatingToolbar editMode={editMode} containerRef={previewRef} primaryColor={primaryColor} />

          {/* Edit hint callout — shown when user tries to interact without edit mode */}
          <AnimatePresence>
            {showEditHint && (
              <motion.div
                initial={{ opacity: 0, y: -4, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -4, x: '-50%' }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="fixed z-[9998] pointer-events-none"
                style={(() => {
                  const btn = editBtnRef.current;
                  if (!btn) return { top: 56, left: 220 };
                  const r = btn.getBoundingClientRect();
                  return { top: r.bottom + 6, left: r.left + r.width / 2 };
                })()}
              >
                <div className="flex flex-col items-center">
                  {/* Arrow pointing up toward Edit button */}
                  <div className="w-2.5 h-1.5 overflow-hidden flex-shrink-0">
                    <div className="w-2.5 h-2.5 bg-slate-800 rotate-45 translate-y-[5px] mx-auto" />
                  </div>
                  <div className="bg-slate-800 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 whitespace-nowrap pointer-events-auto">
                    <span>Aktifkan <strong className="text-blue-300">Edit</strong> untuk mengedit konten</span>
                    <button
                      onClick={() => { setEditMode(true); setShowEditHint(false); }}
                      className="px-2 py-0.5 bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-semibold rounded-lg transition-colors"
                    >
                      Aktifkan
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/*
            transform:translateZ(0) is on the FRAME WRAPPER (not the scroll div).
            This makes position:fixed descendants contained by the frame wrapper
            rather than the viewport — so overlays are sticky to the frame.
            The scroll div is kept separate so that scrolling the content does NOT
            move the fixed overlays (fixed inside a scrollable transform = scrolls).
          */}
          <div
            className="bg-white shadow-xl overflow-hidden flex flex-col"
            style={{
              height: '100%',
              aspectRatio:
                device === 'mobile' ? '9 / 16' :
                device === 'tablet' ? '3 / 4' :
                undefined,
              width: device === 'desktop' ? '100%' : undefined,
              transform: 'translateZ(0)',   // â† contains fixed overlays to this frame
              position: 'relative',
            }}
          >
            {/* Scroll container — no transform so fixed children don't scroll with it */}
            <div
              ref={previewRef}
              data-edit-mode={editMode}
              style={{ overflowY: 'auto', overflowX: 'hidden', height: '100%', position: 'relative', cursor: editMode ? 'default' : undefined }}
              onDoubleClick={() => triggerEditHint()}
              onMouseDown={e => { dragOriginRef.current = { x: e.clientX, y: e.clientY }; }}
              onMouseMove={e => {
                if (!dragOriginRef.current) return;
                const dx = e.clientX - dragOriginRef.current.x;
                const dy = e.clientY - dragOriginRef.current.y;
                if (Math.sqrt(dx * dx + dy * dy) > 6) {
                  dragOriginRef.current = null;
                  triggerEditHint();
                }
              }}
              onMouseUp={() => { dragOriginRef.current = null; }}
              onMouseLeave={() => { dragOriginRef.current = null; }}
              onClickCapture={(e) => {
                // In edit mode, prevent ALL clicks except on editor fields and selection overlay
                if (!editMode) return;
                const target = e.target as HTMLElement;

                // ALLOW: clicks on editor fields (contenteditable) and overlay (for selection)
                if (target.closest('[data-editor-field]') || target.closest('[data-overlay]')) return;

                // BLOCK: everything else
                // - Links (a tags)
                // - Buttons (button, including wishlist)
                // - Divs with onClick handlers (product cards, etc)
                // - Any clickable element with cursor-pointer
                const isLink = target.tagName === 'A' || target.closest('a');
                const isButton = target.tagName === 'BUTTON' || target.closest('button');
                const isClickableDiv = target.closest('[onclick]') || target.closest('.cursor-pointer') || target.closest('.group.cursor-pointer');
                const isWishlist = target.closest('[data-wishlist-btn]');

                if (isLink || isButton || isClickableDiv || isWishlist) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }

                // Final catch-all: block any click that has an onclick attribute anywhere up the tree
                if (target.closest('[onclick]')) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <CartProvider storeId={store.id}>
                <WishlistProvider>
                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" /></div>}>
                    <StorePreview store={previewStore} device={device} editMode={editMode} previewShell onFieldChange={handleFieldChange} onFieldPositionChange={handleFieldPositionChange} onArrayReorder={handleArrayReorder} onPageChange={setCanvasPage} navigateRef={canvasNavigateRef} />
                  </Suspense>
                </WishlistProvider>
              </CartProvider>
              <ElementOverlay containerRef={previewRef} editMode={editMode} elementOverrides={elementOverrides} onElementOverride={handleElementOverride} onTextElementSelected={handleTextElementSelected} />
            </div>
          </div>
        </main>

      </div>

      {/* Publish Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <PublishModal
            store={liveContextStore}
            onPublish={handlePublishComplete}
            onClose={() => setShowPublishModal(false)}
            {...((isPublished || hasPublishedBefore) && liveContextStore.publishedDomain
              ? { fixedSubdomain: liveContextStore.publishedDomain }
              : {})}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


