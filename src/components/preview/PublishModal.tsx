'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Rocket, Check, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';

interface PublishModalProps {
  storeName: string;
  currentDomain: string;
  onPublish: (subdomain: string) => void;
  onClose: () => void;
}

type Step = 'form' | 'processing' | 'success';

const PROCESSING_STEPS = [
  'Registering subdomain...',
  'Configuring SSL certificate...',
  'Publishing your store...',
];

const BASE_DOMAIN = 'storee.co';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function isValidSubdomain(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/.test(value);
}

export default function PublishModal({ storeName, currentDomain, onPublish, onClose }: PublishModalProps) {
  const defaultSub = slugify(currentDomain.replace(`.${BASE_DOMAIN}`, '') || storeName);
  const [subdomain, setSubdomain] = useState(defaultSub);
  const [step, setStep] = useState<Step>('form');
  const [processStep, setProcessStep] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState('');

  const error = subdomain.length > 0 && !isValidSubdomain(subdomain)
    ? 'Only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.'
    : '';

  const handleSubdomainChange = (val: string) => {
    setSubdomain(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const startPublish = () => {
    if (!isValidSubdomain(subdomain)) return;
    const url = `${subdomain}.${BASE_DOMAIN}`;
    setPublishedUrl(url);
    setStep('processing');
    setProcessStep(0);
  };

  useEffect(() => {
    if (step !== 'processing') return;
    let current = 0;
    const advance = () => {
      current += 1;
      if (current < PROCESSING_STEPS.length) {
        setProcessStep(current);
        setTimeout(advance, 900);
      } else {
        setTimeout(() => {
          onPublish(publishedUrl);
          setStep('success');
        }, 700);
      }
    };
    const t = setTimeout(advance, 900);
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === 'processing' ? undefined : onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <AnimatePresence mode="wait">

          {/* ── FORM STEP ── */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Set Your Store URL</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Choose a unique subdomain for your store</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Store URL</label>
                <div className={`flex items-center border rounded-xl overflow-hidden transition-colors ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100'}`}>
                  <input
                    value={subdomain}
                    onChange={e => handleSubdomainChange(e.target.value)}
                    placeholder="your-store"
                    className="flex-1 px-4 py-3 text-sm font-mono text-slate-900 outline-none bg-transparent"
                    autoFocus
                    spellCheck={false}
                  />
                  <span className="px-4 py-3 bg-slate-50 text-sm text-slate-400 font-mono border-l border-slate-200 whitespace-nowrap flex-shrink-0">
                    .{BASE_DOMAIN}
                  </span>
                </div>
                {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
                {!error && subdomain && (
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Your store will be live at <span className="font-mono text-slate-600">{subdomain}.{BASE_DOMAIN}</span>
                  </p>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Included with publish</p>
                <div className="space-y-1.5">
                  {['Free subdomain on storee.co', 'SSL/HTTPS certificate included', 'CDN-optimized for fast loading'].map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-xs text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={startPublish}
                disabled={!subdomain || !!error}
                className="w-full flex items-center justify-center gap-2 py-3 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <Rocket className="w-4 h-4" />
                Publish Store
              </button>
            </motion.div>
          )}

          {/* ── PROCESSING STEP ── */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-5">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Publishing your store</h2>
              <p className="text-xs text-slate-400 font-mono mb-8">{subdomain}.{BASE_DOMAIN}</p>

              <div className="space-y-3 text-left">
                {PROCESSING_STEPS.map((label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      i < processStep ? 'bg-emerald-500' : i === processStep ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                      {i < processStep ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : i === processStep ? (
                        <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <span className={`text-sm transition-colors duration-300 ${
                      i < processStep ? 'text-emerald-600 font-medium' : i === processStep ? 'text-slate-900 font-medium' : 'text-slate-400'
                    }`}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS STEP ── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
              </motion.div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">Store Published!</h2>
              <p className="text-sm text-slate-500 mb-5">Your store is now live and accessible to everyone.</p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-emerald-600 font-medium mb-0.5">Your store URL</p>
                <p className="text-base font-mono font-bold text-emerald-800">https://{publishedUrl}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <a
                  href={`https://${publishedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
                >
                  Open Store
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
