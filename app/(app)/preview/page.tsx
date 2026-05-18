'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Globe, Rocket, LayoutDashboard, ArrowLeft, Sparkles } from 'lucide-react';
import { useStore } from '@/src/context/StoreContext';
import type { StoreDesign } from '@/src/context/StoreContext';
import StorePreview from '@/src/components/preview/StorePreview';
import PublishModal from '@/src/components/preview/PublishModal';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type LayoutStyle = StoreDesign['layoutStyle'];

const BACK_LABELS: Record<string, string> = {
  '/': 'Home',
  '/templates': 'All Templates',
  '/dashboard': 'Dashboard',
};

const LAYOUT_STYLES: { key: LayoutStyle; label: string; desc: string }[] = [
  { key: 'minimal', label: 'Minimal', desc: 'Clean & editorial' },
  { key: 'bold',    label: 'Bold',    desc: 'Dark & high-energy' },
  { key: 'elegant', label: 'Elegant', desc: 'Luxury & refined' },
  { key: 'modern',  label: 'Modern',  desc: 'Airy & contemporary' },
  { key: 'playful', label: 'Playful', desc: 'Fun & colorful' },
];

function getBackLabel(from: string | null): string {
  if (!from) return 'Back';
  if (from.startsWith('/templates/')) return 'Template Preview';
  return BACK_LABELS[from] ?? 'Back';
}

export default function PreviewPage() {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [layoutOverride, setLayoutOverride] = useState<LayoutStyle | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const { generatedStore, activeStore, updateActiveStore } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const backLabel = getBackLabel(from);
  const backHref = from ?? '/';

  const store = generatedStore || activeStore;
  const hasDesign = !!store?.design;

  const activeLayout: LayoutStyle | undefined =
    layoutOverride ?? store?.design?.layoutStyle;

  const previewStore = layoutOverride && store?.design
    ? { ...store, design: { ...store.design, layoutStyle: layoutOverride } }
    : store;

  const handlePublishComplete = (subdomain: string) => {
    updateActiveStore({ status: 'Published', domain: subdomain });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ── Main toolbar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(backHref)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{backLabel}</span>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base">{store?.name || 'Store Preview'}</span>
        </div>

        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          {([
            { mode: 'desktop', Icon: Monitor },
            { mode: 'tablet', Icon: Tablet },
            { mode: 'mobile', Icon: Smartphone },
          ] as const).map(({ mode, Icon }) => (
            <button key={mode} onClick={() => setDevice(mode)} className={`p-2 rounded-lg transition-all ${device === mode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/dashboard')} className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
            <LayoutDashboard className="w-4 h-4" />Dashboard
          </button>
          <button onClick={() => setShowPublishModal(true)} className="flex items-center gap-2 px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md">
            <Rocket className="w-4 h-4" />Publish
          </button>
        </div>
      </div>

      {/* ── Layout style switcher (AI-generated stores only) ───────────────── */}
      {hasDesign && (
        <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-medium hidden sm:inline">Style</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {LAYOUT_STYLES.map(({ key, label, desc }) => {
              const isActive = activeLayout === key;
              return (
                <button
                  key={key}
                  onClick={() => setLayoutOverride(key)}
                  title={desc}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {label}
                  {isActive && store?.design?.layoutStyle === key && !layoutOverride && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {layoutOverride && layoutOverride !== store?.design?.layoutStyle && (
            <button
              onClick={() => setLayoutOverride(null)}
              className="flex-shrink-0 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-auto whitespace-nowrap"
            >
              Reset to AI pick
            </button>
          )}
        </div>
      )}

      {/* ── Browser frame + preview ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
        <motion.div
          animate={{ width: device === 'desktop' ? '100%' : device === 'tablet' ? '768px' : '375px' }}
          transition={{ duration: 0.3 }}
          className="max-w-full rounded-2xl"
          style={{ minWidth: device === 'mobile' ? '375px' : undefined, boxShadow: '0 16px 48px -4px rgba(0,0,0,0.18), 0 6px 16px -2px rgba(0,0,0,0.10)' }}
        >
          <div className="bg-[#f0f0f0] rounded-t-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-mono truncate">https://{store?.domain || 'my-store.storee.co'}</span>
                <div className="ml-auto w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-b-2xl overflow-hidden">
            {previewStore && <StorePreview store={previewStore} device={device} />}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showPublishModal && store && (
          <PublishModal
            storeName={store.name}
            currentDomain={store.domain}
            onPublish={handlePublishComplete}
            onClose={() => setShowPublishModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
