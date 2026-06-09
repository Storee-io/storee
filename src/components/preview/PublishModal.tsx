'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Rocket, Check, ExternalLink, LayoutDashboard, Loader2, AlertCircle, RefreshCw, Copy, Info, Link } from 'lucide-react';
import type { Store } from '@/src/context/StoreContext';
import { findAvailableSubdomain } from '@/src/lib/subdomainGenerator';

interface PublishModalProps {
  store: Store;
  onPublish: (subdomain: string) => void;
  onClose: () => void;
  /** When provided the URL step is skipped and this domain is used as-is */
  fixedSubdomain?: string;
}

type Step = 'form' | 'confirm' | 'processing' | 'success';
type CheckStatus = 'idle' | 'checking' | 'available' | 'taken';

const PROCESSING_STEPS = [
  'Registering subdomain...',
  'Configuring SSL certificate...',
  'Publishing your store...',
];

const BASE_DOMAIN = 'storee.io';
const DEBOUNCE_MS = 600;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function isValidSubdomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{3,48}[a-z0-9]$/.test(value);
}

function getFormatError(value: string): string {
  if (!value) return '';
  if (/[^a-z0-9-]/.test(value))
    return 'Only lowercase letters (a–z), numbers (0–9), and hyphens (-) are allowed.';
  if (/^-|-$/.test(value))
    return 'Cannot start or end with a hyphen.';
  if (value.length < 5)
    return 'Must be at least 5 characters.';
  if (value.length > 50)
    return 'Cannot exceed 50 characters.';
  return '';
}

export default function PublishModal({ store, onPublish, onClose, fixedSubdomain }: PublishModalProps) {
  const router = useRouter();
  const defaultSub = fixedSubdomain ?? slugify(store.domain.replace(`.${BASE_DOMAIN}`, '') || store.name);
  const [subdomain, setSubdomain] = useState(defaultSub);
  const [step, setStep] = useState<Step>('form');
  const [processStep, setProcessStep] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState(fixedSubdomain ? `${fixedSubdomain}.${BASE_DOMAIN}` : '');
  const [formError, setFormError] = useState('');
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [isGeneratingDefault, setIsGeneratingDefault] = useState(!fixedSubdomain);
  const [copied, setCopied] = useState(false);
  const [showCustomDomainToast, setShowCustomDomainToast] = useState(false);

  const apiResultRef = useRef<{ success: boolean; error?: string } | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The store's own published subdomain — upsert is fine for re-publishing
  const ownSubdomain = store.publishedDomain ?? '';

  // ── Auto-generate 3-word default subdomain on first publish ─────────────
  useEffect(() => {
    if (fixedSubdomain) return; // republish — keep existing
    let cancelled = false;
    setIsGeneratingDefault(true);
    findAvailableSubdomain(store.name).then(sub => {
      if (cancelled) return;
      setSubdomain(sub);
      setIsGeneratingDefault(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Availability check ────────────────────────────────────────────────────
  const checkAvailability = useCallback(async (sub: string) => {
    // Own subdomain is always OK (upsert will update it)
    if (sub === ownSubdomain) {
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
  }, [ownSubdomain]);

  // ── Debounced check on input change ──────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValidSubdomain(subdomain)) {
      setCheckStatus('idle');
      return;
    }
    setCheckStatus('checking');
    debounceRef.current = setTimeout(() => checkAvailability(subdomain), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [subdomain, checkAvailability]);


  const formatError = getFormatError(subdomain);

  const handleSubdomainChange = (val: string) => {
    // Strip disallowed chars immediately as user types
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleaned);
    setFormError('');
  };

  const executePublish = useCallback(() => {
    setStep('processing');
    setProcessStep(0);
    apiResultRef.current = null;

    fetch('/api/publish-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain,
        name: store.name,
        primaryColor: store.primaryColor,
        category: store.category,
        templateId: store.template?.id,
        design: store.design,
        currency: store.currency,
        language: store.language,
        font: store.font,
        mood: store.mood,
        audience: store.audience,
      }),
    })
      .then(async res => {
        if (res.ok) {
          apiResultRef.current = { success: true };
        } else {
          const err = await res.json();
          apiResultRef.current = { success: false, error: err.error ?? 'Failed to publish' };
        }
      })
      .catch(() => {
        apiResultRef.current = { success: false, error: 'Network error. Please try again.' };
      });
  }, [subdomain, store]);

  const startPublish = async () => {
    if (formatError || !subdomain) return;

    // If check is still in flight, wait for it
    if (checkStatus === 'checking') {
      await checkAvailability(subdomain);
    }

    // Re-read check status after potential await
    // We call checkAvailability directly so we need to get the final answer
    // by doing a fresh check if still idle/unknown
    if (checkStatus !== 'available' && subdomain !== ownSubdomain) {
      // Do an immediate synchronous check
      setCheckStatus('checking');
      try {
        const res = await fetch(`/api/publish-store?subdomain=${encodeURIComponent(subdomain)}`);
        const { available } = await res.json() as { available: boolean };
        if (!available) {
          setCheckStatus('taken');
          setFormError('This subdomain is already taken. Please choose another.');
          return;
        }
        setCheckStatus('available');
      } catch {
        setFormError('Could not verify subdomain. Please try again.');
        setCheckStatus('idle');
        return;
      }
    }

    const url = `${subdomain}.${BASE_DOMAIN}`;
    setPublishedUrl(url);
    setFormError('');

    // For republish, go directly to processing (no confirmation step)
    // For new publish, go to confirmation step if needed
    executePublish();
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
        const checkAndFinish = () => {
          if (apiResultRef.current === null) {
            setTimeout(checkAndFinish, 200);
            return;
          }
          if (apiResultRef.current.success) {
            onPublish(publishedUrl);
            setStep('success');
          } else {
            setFormError(apiResultRef.current.error ?? 'Failed to publish');
            setStep('form');
          }
        };
        setTimeout(checkAndFinish, 700);
      }
    };

    const t = setTimeout(advance, 900);
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Copy URL to clipboard ───────────────────────────────────────────────
  const handleCopyUrl = useCallback(() => {
    const url = `https://${publishedUrl}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      try {
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  }, [publishedUrl]);

  // ── Show toast for custom domain before publish ───────────────────────
  const handleAddCustomDomainBeforePublish = useCallback(() => {
    setShowCustomDomainToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowCustomDomainToast(false), 10000);
  }, []);

  // ── Derived: is publish button enabled? ──────────────────────────────────
  const canPublish =
    !!subdomain &&
    !formatError &&
    !formError &&
    !isGeneratingDefault &&
    checkStatus !== 'taken' &&
    checkStatus !== 'checking';

  // ── Inline status indicator ───────────────────────────────────────────────
  const renderCheckIndicator = () => {
    if (!subdomain || formatError) return null;
    if (checkStatus === 'checking') {
      return (
        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking availability…
        </p>
      );
    }
    if (checkStatus === 'available') {
      return (
        <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
          <Check className="w-3 h-3" />
          <span className="font-mono font-medium">{subdomain}.{BASE_DOMAIN}</span>
          <span className="text-emerald-500">is available</span>
        </p>
      );
    }
    if (checkStatus === 'taken') {
      return (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          This subdomain is already taken. Try another.
        </p>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === 'processing' ? undefined : onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{ cursor: step === 'processing' ? 'default' : 'pointer' }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]"
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
                    <h2 className="text-lg font-bold text-slate-900">{fixedSubdomain ? 'Republish Store' : 'Set Your Store URL'}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{fixedSubdomain ? 'Publish your latest changes to the live store' : 'Choose a unique subdomain for your store'}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* URL section — editable for new stores, display-only for republish */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Store URL</label>
                  {fixedSubdomain && (
                    <a
                      href={`/dashboard/domain?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors font-medium"
                    >
                      <Link className="w-3.5 h-3.5 flex-shrink-0" />
                      Add custom domain
                    </a>
                  )}
                </div>

                {fixedSubdomain ? (
                  /* Display-only URL for republish — same as UnpublishModal */
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:border-slate-300 transition-colors">
                    <a
                      href={`https://${subdomain}.${BASE_DOMAIN}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center gap-2 px-4 py-3 text-sm font-mono text-slate-900 hover:text-slate-700 transition-colors truncate group"
                    >
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate group-hover:underline">{subdomain}.{BASE_DOMAIN}</span>
                    </a>
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 flex-shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Copy URL"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  /* Editable URL input for new stores */
                  <>
                    <div className="flex items-center justify-between mb-2">
                      {/* Shuffle button — generate a new random subdomain */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsGeneratingDefault(true);
                          setFormError('');
                          findAvailableSubdomain(store.name).then(sub => {
                            setSubdomain(sub);
                            setIsGeneratingDefault(false);
                          });
                        }}
                        disabled={isGeneratingDefault}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 disabled:opacity-40 transition-colors"
                        title="Generate another random URL"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGeneratingDefault ? 'animate-spin' : ''}`} />
                        Shuffle
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomDomainBeforePublish}
                        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors font-medium"
                      >
                        <Link className="w-3.5 h-3.5 flex-shrink-0" />
                        Add custom domain
                      </button>
                    </div>
                    <div className={`flex items-center border rounded-xl overflow-hidden transition-colors ${
                      formatError || formError || checkStatus === 'taken'
                        ? 'border-red-300 ring-2 ring-red-100'
                        : checkStatus === 'available'
                        ? 'border-emerald-400 ring-2 ring-emerald-100'
                        : 'border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100'
                    }`}>
                      <input
                        value={subdomain}
                        onChange={e => handleSubdomainChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && canPublish) startPublish(); }}
                        placeholder="your-store"
                        className="flex-1 px-4 py-3 text-sm font-mono text-slate-900 outline-none bg-transparent"
                        autoFocus
                        spellCheck={false}
                        maxLength={50}
                        disabled={isGeneratingDefault}
                      />
                      {/* Right adornment: spinner / check / x */}
                      <div className="px-3 flex-shrink-0">
                        {(isGeneratingDefault || (checkStatus === 'checking' && isValidSubdomain(subdomain))) && (
                          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        )}
                        {!isGeneratingDefault && checkStatus === 'available' && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                        {!isGeneratingDefault && checkStatus === 'taken' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <span className="pr-4 py-3 bg-slate-50 text-sm text-slate-400 font-mono border-l border-slate-200 whitespace-nowrap flex-shrink-0 pl-3">
                        .{BASE_DOMAIN}
                      </span>
                    </div>

                    {/* Status message below input */}
                    {(formatError || formError)
                      ? <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {formatError || formError}
                        </p>
                      : renderCheckIndicator()
                    }
                  </>
                )}
              </div>

              {/* Toast notification for custom domain — above Included with Publish */}
              {showCustomDomainToast && (
                <div className="mb-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">Publish your store first, then you can add a custom domain.</p>
                </div>
              )}

              {/* Info section — only show for new stores */}
              {!fixedSubdomain && (
                <div className="bg-slate-50 rounded-xl p-4 mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Included with publish</p>
                  <div className="space-y-1.5">
                    {['Free subdomain on storee.io', 'SSL/HTTPS certificate included', 'CDN-optimized for fast loading'].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description for republish */}
              {fixedSubdomain && (
                <p className="text-sm text-slate-500 mb-6">
                  Your store <span className="font-semibold text-slate-700">{store.name}</span> will go live and be accessible to everyone. Latest changes will be published.
                </p>
              )}

              {/* Button layout: single for new publish, two for republish */}
              {fixedSubdomain ? (
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startPublish}
                    disabled={!canPublish}
                    className="flex-1 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                  >
                    Republish Now
                  </button>
                </div>
              ) : (
                <button
                  onClick={startPublish}
                  disabled={!canPublish}
                  className="w-full flex items-center justify-center gap-2 py-3 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <Rocket className="w-4 h-4" />
                  Publish
                </button>
              )}
            </motion.div>
          )}

          {/* ── CONFIRMATION STEP (Republish) ── */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Update Live Store?</h2>
                    <p className="text-xs text-slate-500 mt-0.5">This will replace your current published content</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Your live store at</p>
                  <p className="font-mono font-semibold text-amber-900">https://{publishedUrl}</p>
                  <p>will be updated with your latest changes.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executePublish}
                  className="flex-1 flex items-center justify-center gap-2 py-3 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
                >
                  <Rocket className="w-4 h-4" />
                  Update Live
                </button>
              </div>
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
                <p className="text-xs text-emerald-600 font-medium mb-2">Your store URL</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-bold text-emerald-800 flex-1 break-all">https://{publishedUrl}</p>
                  <button
                    onClick={handleCopyUrl}
                    className="flex-shrink-0 p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-emerald-600 font-medium mt-2">✓ Copied to clipboard</p>
                )}
              </div>

              <div className="flex gap-3">
                <a
                  href={`https://${publishedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Open Store
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => { onClose(); router.push('/dashboard'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  View Dashboard
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
