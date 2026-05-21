'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Monitor, Tablet, Smartphone, Globe, Rocket } from 'lucide-react';
import { templates } from '@/src/data/templates';
import { useStore } from '@/src/context/StoreContext';
import StorePreview from '@/src/components/preview/StorePreview';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const BACK_LABELS: Record<string, string> = {
  '/': 'Home',
  '/templates': 'All Templates',
};

interface Props {
  id: string;
  from: string;
}

export default function TemplatePreviewClient({ id, from }: Props) {
  const router = useRouter();
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const template = templates.find(t => t.id === id);
  const { addStore, setGeneratedStore } = useStore();

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Template not found.
      </div>
    );
  }

  const backHref = from || '/templates';
  const backLabel = BACK_LABELS[from] ?? 'All Templates';
  const domain = `${template.name.toLowerCase().replace(/\s+/g, '-')}.storee.io`;

  const previewStore = {
    id: 'preview',
    name: template.name,
    domain,
    status: 'Draft' as const,
    template,
    primaryColor: template.primaryColor,
    createdAt: '',
    category: template.category,
    revenue: 0,
    orders: 0,
  };

  const handleUse = async () => {
    const newStore = {
      id: `store-${Date.now()}`,
      name: template.name,
      domain,
      status: 'Draft' as const,
      template,
      primaryColor: template.primaryColor,
      createdAt: new Date().toISOString(),
      category: template.category,
      revenue: 0,
      orders: 0,
    };
    await addStore(newStore);
    setGeneratedStore(newStore);
    router.push(`/preview?from=/templates/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{backLabel}</span>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <span className="font-semibold text-slate-900 text-sm sm:text-base">{template.name}</span>
        </div>

        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          {([
            { mode: 'desktop', Icon: Monitor },
            { mode: 'tablet', Icon: Tablet },
            { mode: 'mobile', Icon: Smartphone },
          ] as const).map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setDevice(mode)}
              className={`p-2 rounded-lg transition-all ${
                device === mode
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <button
          onClick={handleUse}
          className="flex items-center gap-2 px-5 py-2 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
        >
          <Rocket className="w-4 h-4" />
          Use Template
        </button>
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
                <span className="text-xs text-slate-500 font-mono truncate">https://{domain}</span>
                <div className="ml-auto w-3.5 h-3.5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-b-2xl overflow-hidden">
            <StorePreview store={previewStore} device={device} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
