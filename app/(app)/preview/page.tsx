'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Globe, Rocket, LayoutDashboard, ArrowLeft, Check } from 'lucide-react';
import { useStore } from '@/src/context/StoreContext';
import StorePreview from '@/src/components/preview/StorePreview';

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

export default function PreviewPage() {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [published, setPublished] = useState(false);
  const { generatedStore, activeStore } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const backLabel = getBackLabel(from);
  const backHref = from ?? '/';

  const store = generatedStore || activeStore;

  const handlePublish = () => {
    setPublished(true);
    setTimeout(() => setPublished(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
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
          <button onClick={handlePublish} className="flex items-center gap-2 px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md">
            {published ? <><Check className="w-4 h-4" />Published!</> : <><Rocket className="w-4 h-4" />Publish</>}
          </button>
        </div>
      </div>

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
            {store && <StorePreview store={store} device={device} />}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {published && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Store Published!</p>
              <p className="text-xs text-slate-400">{store?.domain}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
