'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Tablet, Smartphone, ChevronDown, ChevronRight,
  Check, Save, ExternalLink, Sparkles, Type, Image as ImageIcon,
  Star, MessageSquare, HelpCircle, Mail, Shield, BookOpen,
  Megaphone, Layers, Plus, Trash2, GripVertical, Palette,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import StorePreview from '../../preview/StorePreview';
import type { StoreDesign } from '../../../lib/claudeApi';

type Device = 'desktop' | 'tablet' | 'mobile';

// â”€â”€ Small reusable field components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
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
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white transition-all"
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
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white resize-none transition-all"
    />
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 cursor-pointer">
        <div className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1 px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white transition-all"
      />
      {label && <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>}
    </div>
  );
}

// â”€â”€ Accordion section wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Section({
  icon: Icon, title, open, onToggle, children,
}: {
  icon: React.ElementType; title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Editor() {
  const { activeStore, updateActiveStore } = useStore();
  const [device, setDevice] = useState<Device>('desktop');
  const [openSection, setOpenSection] = useState<string>('hero');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local editable state — mirrors store design
  const design = activeStore?.design;

  const [storeName, setStoreName]       = useState(activeStore?.name ?? '');
  const [tagline, setTagline]           = useState(design?.tagline ?? '');
  const [heroTitle, setHeroTitle]       = useState(design?.heroTitle ?? '');
  const [heroSubtitle, setHeroSubtitle] = useState(design?.heroSubtitle ?? '');
  const [ctaText, setCtaText]           = useState(design?.ctaText ?? '');
  const [promoBar, setPromoBar]         = useState(design?.promoBar ?? '');
  const [primaryColor, setPrimaryColor] = useState(activeStore?.primaryColor ?? '#10b981');
  const [accentColor, setAccentColor]   = useState(design?.accentColor ?? '#06b6d4');
  const [brandStory, setBrandStory]     = useState(design?.brandStory ?? '');

  const [features, setFeatures]         = useState(design?.features ?? []);
  const [testimonials, setTestimonials] = useState(design?.testimonials ?? []);
  const [faq, setFaq]                   = useState(design?.faq ?? []);
  const [newsletter, setNewsletter]     = useState(design?.newsletter ?? { headline: '', subtext: '' });

  // Sync whenever store or its design changes
  useEffect(() => {
    if (!activeStore) return;
    const d = activeStore.design;
    setStoreName(activeStore.name ?? '');
    setTagline(d?.tagline ?? '');
    setHeroTitle(d?.heroTitle ?? '');
    setHeroSubtitle(d?.heroSubtitle ?? '');
    setCtaText(d?.ctaText ?? '');
    setPromoBar(d?.promoBar ?? '');
    setPrimaryColor(activeStore.primaryColor ?? '#10b981');
    setAccentColor(d?.accentColor ?? '#06b6d4');
    setBrandStory(d?.brandStory ?? '');
    setFeatures(d?.features ?? []);
    setTestimonials(d?.testimonials ?? []);
    setFaq(d?.faq ?? []);
    setNewsletter(d?.newsletter ?? { headline: '', subtext: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, activeStore?.design, activeStore?.primaryColor]);

  // Live preview store — merges edits into activeStore shape
  const liveStore = activeStore ? {
    ...activeStore,
    name: storeName,
    primaryColor,
    design: {
      ...activeStore.design,
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
  } : activeStore;

  const toggle = (key: string) => setOpenSection(s => s === key ? '' : key);

  const handleSave = useCallback(async () => {
    if (!activeStore || isSaving) return;
    setIsSaving(true);

    const newDesign: StoreDesign = {
      ...(activeStore.design as StoreDesign),
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
    };

    try {
      updateActiveStore({ name: storeName, primaryColor, design: newDesign });

      // Sync to published store if live
      if (activeStore.status === 'Published') {
        const subdomain = activeStore.publishedDomain?.split('.')[0] ?? activeStore.domain?.split('.')[0];
        if (subdomain) {
          await fetch('/api/publish-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subdomain,
              name: storeName,
              primaryColor,
              category: activeStore.category,
              templateId: activeStore.template?.id,
              design: newDesign,
              currency: activeStore.currency,
              language: activeStore.language,
              font: activeStore.font,
              mood: activeStore.mood,
              audience: activeStore.audience,
              paymentSettings: activeStore.paymentSettings,
              shippingSettings: activeStore.shippingSettings,
              checkoutSettings: activeStore.checkoutSettings,
            }),
          }).catch(console.error);
        }
      }

      toast.success('Store design saved');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save store design');
    } finally {
      setIsSaving(false);
    }
  }, [activeStore, storeName, primaryColor, tagline, heroTitle, heroSubtitle, ctaText, promoBar, accentColor, brandStory, features, testimonials, faq, newsletter, updateActiveStore, isSaving]);

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No active store. Please select or create a store first.
      </div>
    );
  }

  const isPublished = activeStore.status === 'Published';
  const storefrontUrl = activeStore.publishedDomain
    ? `https://${activeStore.publishedDomain}.storee.io`
    : null;

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">

      {/* â”€â”€ Left sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">

        {/* Sidebar header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Canvas</h2>
            <p className="text-xs text-slate-400 mt-0.5">{activeStore.name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {isPublished && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
            )}
          </div>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto">

          {/* General */}
          <Section icon={Layers} title="General" open={openSection === 'general'} onToggle={() => toggle('general')}>
            <Field label="Store Name">
              <Input value={storeName} onChange={setStoreName} placeholder="My Store" />
            </Field>
            <Field label="Tagline">
              <Input value={tagline} onChange={setTagline} placeholder="Short brand tagline" />
            </Field>
            <Field label="Primary Color">
              <ColorInput value={primaryColor} onChange={setPrimaryColor} />
            </Field>
            <Field label="Accent Color">
              <ColorInput value={accentColor} onChange={setAccentColor} />
            </Field>
          </Section>

          {/* Hero */}
          <Section icon={Type} title="Hero Section" open={openSection === 'hero'} onToggle={() => toggle('hero')}>
            <Field label="Headline">
              <Textarea value={heroTitle} onChange={setHeroTitle} placeholder="Your bold headline" rows={2} />
            </Field>
            <Field label="Subheadline">
              <Textarea value={heroSubtitle} onChange={setHeroSubtitle} placeholder="Supporting text under the headline" rows={3} />
            </Field>
            <Field label="CTA Button Text">
              <Input value={ctaText} onChange={setCtaText} placeholder="Shop Now" />
            </Field>
          </Section>

          {/* Promo Bar */}
          <Section icon={Megaphone} title="Promo Bar" open={openSection === 'promoBar'} onToggle={() => toggle('promoBar')}>
            <Field label="Announcement Text">
              <Input value={promoBar} onChange={setPromoBar} placeholder="ðŸŽ‰ Free shipping on orders over $50!" />
            </Field>
            <p className="text-xs text-slate-400">Leave empty to hide the promo bar.</p>
          </Section>

          {/* Features */}
          <Section icon={Sparkles} title="Features" open={openSection === 'features'} onToggle={() => toggle('features')}>
            {features.map((f, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2 relative group">
                <button
                  onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <Field label={`Feature ${i + 1} title`}>
                  <Input value={f.title} onChange={v => setFeatures(features.map((x, idx) => idx === i ? { ...x, title: v } : x))} />
                </Field>
                <Field label="Description">
                  <Textarea value={f.description} onChange={v => setFeatures(features.map((x, idx) => idx === i ? { ...x, description: v } : x))} rows={2} />
                </Field>
              </div>
            ))}
            <button
              onClick={() => setFeatures([...features, { icon: 'âœ¨', title: '', description: '' }])}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Feature
            </button>
          </Section>

          {/* Testimonials */}
          <Section icon={Star} title="Testimonials" open={openSection === 'testimonials'} onToggle={() => toggle('testimonials')}>
            {testimonials.map((t, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2 relative group">
                <button
                  onClick={() => setTestimonials(testimonials.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <Field label="Review text">
                  <Textarea value={t.text} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, text: v } : x))} rows={2} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Author">
                    <Input value={t.author} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, author: v } : x))} />
                  </Field>
                  <Field label="Role">
                    <Input value={t.role} onChange={v => setTestimonials(testimonials.map((x, idx) => idx === i ? { ...x, role: v } : x))} />
                  </Field>
                </div>
              </div>
            ))}
            <button
              onClick={() => setTestimonials([...testimonials, { text: '', author: '', role: '', rating: 5 }])}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Testimonial
            </button>
          </Section>

          {/* FAQ */}
          <Section icon={HelpCircle} title="FAQ" open={openSection === 'faq'} onToggle={() => toggle('faq')}>
            {faq.map((item, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-2 relative group">
                <button
                  onClick={() => setFaq(faq.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <Field label="Question">
                  <Input value={item.q} onChange={v => setFaq(faq.map((x, idx) => idx === i ? { ...x, q: v } : x))} />
                </Field>
                <Field label="Answer">
                  <Textarea value={item.a} onChange={v => setFaq(faq.map((x, idx) => idx === i ? { ...x, a: v } : x))} rows={2} />
                </Field>
              </div>
            ))}
            <button
              onClick={() => setFaq([...faq, { q: '', a: '' }])}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </Section>

          {/* Newsletter */}
          <Section icon={Mail} title="Newsletter" open={openSection === 'newsletter'} onToggle={() => toggle('newsletter')}>
            <Field label="Headline">
              <Input value={newsletter.headline} onChange={v => setNewsletter(n => ({ ...n, headline: v }))} placeholder="Stay in the loop" />
            </Field>
            <Field label="Subtext">
              <Textarea value={newsletter.subtext} onChange={v => setNewsletter(n => ({ ...n, subtext: v }))} placeholder="Subscribe for exclusive deals and new arrivals." rows={2} />
            </Field>
            <p className="text-xs text-slate-400">Leave headline empty to hide this section.</p>
          </Section>

          {/* Brand Story */}
          <Section icon={BookOpen} title="Brand Story" open={openSection === 'brandStory'} onToggle={() => toggle('brandStory')}>
            <Field label="Story Text">
              <Textarea value={brandStory} onChange={setBrandStory} placeholder="Tell your brand's story..." rows={5} />
            </Field>
            <p className="text-xs text-slate-400">Leave empty to hide this section.</p>
          </Section>

        </div>

        {/* Save button */}
        <div className="p-4 border-t border-slate-100 flex-shrink-0 space-y-2">
          {storefrontUrl && (
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 border border-slate-200 rounded-xl hover:border-emerald-300 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Live Store
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {saved
              ? <><Check className="w-4 h-4" /> Saved!</>
              : isSaving
              ? <><Save className="w-4 h-4 animate-pulse" /> Saving...</>
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </button>
          {isPublished && (
            <p className="text-[10px] text-center text-slate-400">Changes will sync to your live store</p>
          )}
        </div>
      </div>

      {/* â”€â”€ Right: Preview area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <div className="h-12 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 gap-4">
          <span className="text-xs text-slate-400">Live Preview</span>

          {/* Device toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {([
              { key: 'desktop', icon: Monitor },
              { key: 'tablet',  icon: Tablet },
              { key: 'mobile',  icon: Smartphone },
            ] as const).map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setDevice(key)}
                className={`p-1.5 rounded-lg transition-all ${device === key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <div className="w-24" />
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-slate-100 flex justify-center p-6">
          <div
            className="bg-white shadow-xl rounded-2xl overflow-hidden transition-all duration-300 self-start"
            style={{
              width: device === 'mobile' ? 390 : device === 'tablet' ? 768 : '100%',
              minWidth: device === 'desktop' ? 900 : undefined,
            }}
          >
            {liveStore && <StorePreview store={liveStore} device={device} />}
          </div>
        </div>
      </div>
    </div>
  );
}

