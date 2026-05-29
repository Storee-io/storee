'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Tablet, Smartphone, ChevronDown, ChevronRight,
  Check, Save, ExternalLink, Type, Star, HelpCircle, Mail,
  BookOpen, Megaphone, Layers, Plus, Trash2, ArrowLeft,
  Sparkles, Globe,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import StorePreview from '../preview/StorePreview';
import type { Store } from '../../context/StoreContext';
import type { StoreDesign } from '../../lib/claudeApi';

type Device = 'desktop' | 'tablet' | 'mobile';

// ── Shared field primitives ───────────────────────────────────────────────────

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

// ── Accordion section ─────────────────────────────────────────────────────────

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

  // Use live store from context when possible
  const liveContextStore = activeStore?.id === store.id ? activeStore : store;

  const d = liveContextStore.design;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContextStore.id, liveContextStore.design, liveContextStore.primaryColor]);

  // Merged preview store
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
    } as StoreDesign,
  };

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
    setTimeout(() => setSaved(false), 2000);
  }, [liveContextStore, storeName, primaryColor, tagline, heroTitle, heroSubtitle, ctaText,
      promoBar, accentColor, brandStory, features, testimonials, faq, newsletter, updateActiveStore, isSaving]);

  const isPublished = liveContextStore.status === 'Published';
  const storefrontUrl = liveContextStore.publishedDomain
    ? `https://${liveContextStore.publishedDomain}.storee.io`
    : null;
  const backHref = from ?? '/dashboard';

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">

      {/* ── Top bar (same structure as PreviewShell) ──────────────────────────── */}
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

        {/* Center — device switcher (truly centered) */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 flex-shrink-0">
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

        {/* Right — icon-only action buttons */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {/* View live store */}
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

          {/* Save — keeps label as primary CTA */}
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

        {/* Preview */}
        <main className="flex-1 overflow-auto bg-slate-100 flex justify-center p-6">
          <div
            className="bg-white shadow-xl rounded-2xl overflow-hidden self-start transition-all duration-300"
            style={{
              width: device === 'mobile' ? 390 : device === 'tablet' ? 768 : '100%',
              minWidth: device === 'desktop' ? 960 : undefined,
            }}
          >
            <StorePreview store={previewStore} device={device} />
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">

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

          </div>

          {/* Bottom hint */}
          {isPublished && (
            <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
              <p className="text-[10px] text-slate-400 text-center">Save syncs changes to your live store</p>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
