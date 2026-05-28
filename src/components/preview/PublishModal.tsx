'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Globe, Rocket, Check, ExternalLink, ArrowLeft,
  Loader2, AlertCircle, Pencil, CheckCircle2,
} from 'lucide-react';
import type { Store } from '@/src/context/StoreContext';
import { findAvailableSubdomain } from '@/src/lib/subdomainGenerator';

interface PublishModalProps {
  store: Store;
  onPublish: (subdomain: string) => void;
  onClose: () => void;
  /** When provided, republishes using this exact subdomain (no auto-generate). */
  fixedSubdomain?: string;
}

type Step = 'generating' | 'processing' | 'success';
type CheckStatus = 'idle' | 'checking' | 'available' | 'taken';

const BASE_DOMAIN = 'storee.io';
const DEBOUNCE_MS = 600;

const PROCESSING_STEPS = [
  'Registering subdomain...',
  'Configuring SSL certificate...',
  'Publishing your store...',
];

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

function getFormatError(value: string): string {
  if (!value) return '';
  if (/[^a-z0-9-]/.test(value)) return 'Only lowercase letters, numbers, and hyphens.';
  if (/^-|-$/.test(value)) return 'Cannot start or end with a hyphen.';
  if (value.length < 3) return 'Must be at least 3 characters.';
  if (value.length > 50) return 'Cannot exceed 50 characters.';
  return '';
}

async function callPublishApi(params: {
  subdomain: string; store: Store;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/publish-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain: params.subdomain,
        name: params.store.name,
        primaryColor: params.store.primaryColor,
        category: params.store.category,
        templateId: params.store.template?.id,
        design: params.store.design,
        currency: params.store.currency,
        language: params.store.language,
      }),
    });
    if (res.ok) return { success: true };
    const err = await res.json();
    return { success: false, error: err.error ?? 'Failed to publish' };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export default function PublishModal({ store, onPublish, onClose, fixedSubdomain }: PublishModalProps) {
  const [step, setStep] = useState<Step>('generating');
  const [processStep, setProcessStep] = useState(0);
  const [subdomain, setSubdomain] = useState(fixedSubdomain ?? '');
  const [publishError, setPublishError] = useState('');

  // Change-subdomain UI (shown on success screen)
  const [showChange, setShowChange] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [changeError, setChangeError] = useState('');
  const [changeSaving, setChangeSaving] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);

  const apiResultRef = useRef<{ success: boolean; error?: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownSubdomain = store.publishedDomain ?? fixedSubdomain ?? '';

  // ── Step 1: auto-generate (or use fixedSubdomain) then start publishing ────
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      let sub: string;

      if (fixedSubdomain) {
        sub = fixedSubdomain;
      } else {
        // Auto-generate an available 3-word subdomain
        sub = await findAvailableSubdomain(store.name);
      }

      if (cancelled) return;
      setSubdomain(sub);
      setStep('processing');
      setProcessStep(0);
      apiResultRef.current = null;

      const result = await callPublishApi({ subdomain: sub, store });
      apiResultRef.current = result;
    }

    prepare();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 2: animate processing steps then transition to success/error ────────
  useEffect(() => {
    if (step !== 'processing') return;
    let current = 0;

    const advance = () => {
      current += 1;
      if (current < PROCESSING_STEPS.length) {
        setProcessStep(current);
        setTimeout(advance, 900);
      } else {
        const checkAndFinish = () => {
          if (apiResultRef.current === null) {
            setTimeout(checkAndFinish, 200);
            return;
          }
          if (apiResultRef.current.success) {
            onPublish(`${subdomain}.${BASE_DOMAIN}`);
            setStep('success');
          } else {
            setPublishError(apiResultRef.current.error ?? 'Failed to publish');
            // Stay on generating/processing with error shown
            setStep('generating');
          }
        };
        setTimeout(checkAndFinish, 700);
      }
    };

    const t = setTimeout(advance, 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Availability check for change-subdomain input ───────────────────────────
  const checkAvailability = useCallback(async (sub: string) => {
    if (sub === ownSubdomain || sub === subdomain) {
      setCheckStatus('available');
      return;
    }
    setCheckStatus('checking');
    try {
      const res = await fetch(`/api/publish-store?subdomain=${encodeURIComponent(sub)}`);
      if (!res.ok) { setCheckStatus('idle'); return; }
      const { available } = await res.json() as { available: boolean };
      setCheckStatus(available ? 'available' : 'taken');
    } catch {
      setCheckStatus('idle');
    }
  }, [ownSubdomain, subdomain]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!newSub || !isValidSubdomain(newSub)) { setCheckStatus('idle'); return; }
    setCheckStatus('checking');
    debounceRef.current = setTimeout(() => checkAvailability(newSub), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [newSub, checkAvailability]);

  const handleChangeSubdomain = async () => {
    const formatErr = getFormatError(newSub);
    if (formatErr || !newSub) return;
    if (checkStatus === 'taken') { setChangeError('This subdomain is already taken.'); return; }
    setChangeSaving(true);
    setChangeError('');

    const result = await callPublishApi({ subdomain: newSub, store });
    setChangeSaving(false);

    if (result.success) {
      setSubdomain(newSub);
      onPublish(`${newSub}.${BASE_DOMAIN}`);
      setShowChange(false);
      setChangeSuccess(true);
      setNewSub('');
      setCheckStatus('idle');
    } else {
      setChangeError(result.error ?? 'Failed to update subdomain.');
    }
  };

  const formatError = getFormatError(newSub);
  const canSave =
    !!newSub && !formatError && !changeError &&
    checkStatus === 'available' && !changeSaving;

  // ── Render ──────────────────────────────────────────────────────────────────
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

          {/* ── GENERATING / ERROR STATE ── */}
          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center"
            >
              {publishError ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">Publish Failed</h2>
                  <p className="text-sm text-slate-500 mb-6">{publishError}</p>
                  <button
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-5">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">Preparing your store…</h2>
                  <p className="text-xs text-slate-400">Finding a great URL for you</p>
                </>
              )}
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
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {fixedSubdomain ? 'Republishing your store' : 'Publishing your store'}
              </h2>
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
              className="p-6"
            >
              {/* Header */}
              <div className="text-center mb-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
                </motion.div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Store Published!</h2>
                <p className="text-sm text-slate-500">Your store is now live and accessible to everyone.</p>
              </div>

              {/* URL display */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-3">
                <p className="text-xs text-emerald-600 font-medium mb-0.5">Your store URL</p>
                <p className="text-base font-mono font-bold text-emerald-800 break-all">
                  https://{changeSuccess ? newSub || subdomain : subdomain}.{BASE_DOMAIN}
                </p>
              </div>

              {/* Change subdomain toggle */}
              {!showChange && (
                <button
                  onClick={() => { setShowChange(true); setNewSub(''); setCheckStatus('idle'); setChangeError(''); }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 transition-colors mb-4"
                >
                  <Pencil className="w-3 h-3" />
                  Change subdomain
                </button>
              )}

              {/* Change subdomain form */}
              <AnimatePresence>
                {showChange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="pt-1 pb-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-600 mb-2">New subdomain</p>
                      <div className={`flex items-center border rounded-xl overflow-hidden transition-colors mb-1.5 ${
                        formatError || changeError || checkStatus === 'taken'
                          ? 'border-red-300 ring-2 ring-red-100'
                          : checkStatus === 'available'
                          ? 'border-emerald-400 ring-2 ring-emerald-100'
                          : 'border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100'
                      }`}>
                        <input
                          value={newSub}
                          onChange={e => {
                            const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setNewSub(cleaned);
                            setChangeError('');
                          }}
                          onKeyDown={e => { if (e.key === 'Enter' && canSave) handleChangeSubdomain(); }}
                          placeholder={slugify(store.name) || 'your-store'}
                          className="flex-1 px-3 py-2.5 text-sm font-mono text-slate-900 outline-none bg-transparent"
                          autoFocus
                          spellCheck={false}
                          maxLength={50}
                        />
                        <div className="px-2 flex-shrink-0">
                          {checkStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                          {checkStatus === 'available' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          {checkStatus === 'taken' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                        <span className="pr-3 py-2.5 bg-slate-50 text-xs text-slate-400 font-mono border-l border-slate-200 pl-2 whitespace-nowrap flex-shrink-0">
                          .{BASE_DOMAIN}
                        </span>
                      </div>

                      {(formatError || changeError) && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mb-2">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {formatError || changeError}
                        </p>
                      )}
                      {checkStatus === 'available' && !formatError && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1 mb-2">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="font-mono">{newSub}.{BASE_DOMAIN}</span> is available
                        </p>
                      )}

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setShowChange(false); setNewSub(''); setCheckStatus('idle'); setChangeError(''); }}
                          className="flex-1 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleChangeSubdomain}
                          disabled={!canSave}
                          className="flex-1 py-2 text-xs font-semibold text-white gradient-bg rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
                        >
                          {changeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                          {changeSaving ? 'Saving…' : 'Update'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <a
                  href={`https://${subdomain}.${BASE_DOMAIN}`}
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
