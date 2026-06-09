'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  Globe, Check, Copy, ExternalLink, AlertCircle, CheckCircle2,
  Loader2, X, Link2,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { supabase } from '../../../lib/supabase';
import PublishModal from '../../preview/PublishModal';

type VerifyStatus = 'idle' | 'checking' | 'verified' | 'pending';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  note?: string;
}

export default function DomainSettings() {
  const searchParams = useSearchParams();
  const storeId = searchParams?.get('storeId');
  const { activeStore, updateActiveStore, stores, setActiveStore } = useStore();

  // Determine which store to display: if storeId param exists, use that; otherwise use activeStore
  const displayStore = storeId && stores.length > 0
    ? stores.find(s => s.id === storeId) ?? activeStore
    : activeStore;

  // Show loading if storeId exists but doesn't match activeStore yet
  // This prevents showing the wrong store while waiting for sync
  const isLoading = !!(storeId && activeStore?.id !== storeId);

  // Sync activeStore with displayStore if they differ
  useEffect(() => {
    if (displayStore && displayStore.id !== activeStore?.id) {
      setActiveStore(displayStore);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, stores]);

  const existingDomain = displayStore?.customDomain ?? '';
  const isPublished = displayStore?.status === 'Published';
  const subdomain = displayStore?.publishedDomain?.split('.')[0]
    ?? displayStore?.domain?.split('.')[0]
    ?? '';

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [copied, setCopied] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dnsRecords: DnsRecord[] = existingDomain
    ? [
        { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com', note: 'For www.domain.com' },
        { type: 'A',     name: '@',   value: '76.76.21.21',           note: 'For root domain (apex)' },
      ]
    : [];

  const handleConnect = async () => {
    if (!displayStore) return;
    setError('');
    setSaving(true);

    const res = await fetch('/api/custom-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: displayStore.id, subdomain, domain: input }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? 'Failed to connect domain'); return; }

    updateActiveStore({ customDomain: data.domain });
    setInput('');
    setVerifyStatus('pending');
  };

  const handleRemove = async () => {
    if (!displayStore || !existingDomain) return;
    setRemoving(true);
    setError('');

    const res = await fetch('/api/custom-domain', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: displayStore.id, subdomain, domain: existingDomain }),
    });

    setRemoving(false);

    if (res.ok) {
      updateActiveStore({ customDomain: undefined });
      setVerifyStatus('idle');
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to remove domain');
    }
  };

  const checkVerification = async () => {
    if (!existingDomain) return;
    setVerifyStatus('checking');
    const res = await fetch(`/api/custom-domain/verify?domain=${encodeURIComponent(existingDomain)}`);
    const data = await res.json();
    setVerifyStatus(data.verified ? 'verified' : 'pending');
  };

  const copyToClipboard = (text: string, key: string) => {
    const doFallback = () => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
      document.body.appendChild(el);
      el.focus();
      el.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(el);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(doFallback);
    } else {
      doFallback();
    }

    setCopied(key);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(null), 2000);
  };

  // On mount, re-fetch the latest custom_domain from DB in case context is stale
  useEffect(() => {
    if (!displayStore?.id) return;
    supabase
      .from('stores')
      .select('custom_domain')
      .eq('id', displayStore.id)
      .single()
      .then(({ data }) => {
        const freshDomain = data?.custom_domain ?? undefined;
        if (freshDomain && freshDomain !== displayStore.customDomain) {
          updateActiveStore({ customDomain: freshDomain });
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStore?.id]);

  // Auto-check only on initial load (when domain already exists in context/DB)
  // NOT after a fresh connect — user must set DNS first, then click manually.
  const didAutoCheck = useRef(false);
  useEffect(() => {
    if (existingDomain && verifyStatus === 'idle' && !didAutoCheck.current) {
      didAutoCheck.current = true;
      checkVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDomain]);

  // Show loading state while waiting for correct store to sync
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading store...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Domain</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your store&apos;s URLs and custom domain</p>
        </div>

        {/* Storee URL */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
              <Globe className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Storee URL</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your free subdomain on storee.io</p>
            </div>
          </div>

          {isPublished && subdomain ? (
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <span className="px-4 py-2.5 text-sm font-medium text-slate-800 truncate flex-1">
                {subdomain}.storee.io
              </span>
              <a
                href={`https://${subdomain}.storee.io`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 flex-shrink-0 text-slate-400 hover:text-emerald-500 transition-colors"
                title="Open store"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-400">
                Your Storee URL will appear here once you publish your store.
              </span>
            </div>
          )}
        </div>

        {/* Custom Domain */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
              <Link2 className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Custom Domain</h3>
              <p className="text-xs text-slate-400 mt-0.5">Connect your own domain to your store</p>
            </div>
          </div>

          {/* Publish nudge */}
          {!isPublished && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 flex-1">
                Your store must be published before a custom domain can go live.{' '}
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="font-semibold underline underline-offset-2 hover:text-amber-900 transition-colors"
                >
                  Publish now →
                </button>
              </p>
            </div>
          )}

          {existingDomain ? (
            <div className="space-y-3">
              {/* Domain pill */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <Link2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-emerald-800 flex-1 truncate">{existingDomain}</span>

                {verifyStatus === 'checking' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />}
                {verifyStatus === 'verified' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                )}
                {verifyStatus === 'pending' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    <AlertCircle className="w-3 h-3" /> Pending DNS
                  </span>
                )}

                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  title="Remove domain"
                >
                  {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </div>

              {/* DNS instructions */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-600">
                    Point your domain to Storee — add these DNS records at your registrar:
                  </p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2 text-left font-semibold text-slate-500 w-16">Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-500 w-12">Name</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-500">Value</th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-500 hidden sm:table-cell w-40"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnsRecords.map((rec, i) => (
                      <tr key={i} className={i < dnsRecords.length - 1 ? 'border-b border-slate-100' : ''}>
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-violet-600">{rec.type}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-slate-700">{rec.name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => copyToClipboard(rec.value, `${i}`)}
                            className="group/val flex items-center gap-1.5 text-left"
                            title="Click to copy"
                          >
                            <span className="font-mono text-slate-700 break-all group-hover/val:text-emerald-600 transition-colors">
                              {rec.value}
                            </span>
                            {copied === `${i}`
                              ? <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              : <Copy className="w-3 h-3 text-slate-300 group-hover/val:text-emerald-400 flex-shrink-0 transition-colors" />}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                          {rec.note && (
                            <span className="text-[10px] text-slate-300 font-sans whitespace-nowrap">{rec.note}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {verifyStatus !== 'verified' && (
                <button
                  onClick={checkVerification}
                  disabled={verifyStatus === 'checking'}
                  className="flex items-center gap-2 text-sm text-emerald-600 font-semibold hover:text-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {verifyStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {verifyStatus === 'checking' ? 'Checking...' : 'Check Verification'}
                </button>
              )}

              {verifyStatus === 'verified' && (
                <p className="text-xs text-emerald-600">
                  ✓ Your domain is active. Visitors to <strong>{existingDomain}</strong> will see your store.
                </p>
              )}
              {verifyStatus === 'pending' && (
                <p className="text-xs text-amber-600">
                  DNS changes can take up to 48 hours to propagate. Add the records above, then click &quot;Check Verification&quot;.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !saving && input.trim() && handleConnect()}
                  placeholder="mystore.com"
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <button
                  onClick={handleConnect}
                  disabled={saving || !input.trim()}
                  className="px-5 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Connecting...' : 'Connect'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Enter your domain without http:// — e.g. <span className="font-mono">mystore.com</span>
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      <AnimatePresence>
        {showPublishModal && displayStore && (
          <PublishModal
            store={displayStore}
            onPublish={(publishedUrl) => {
              updateActiveStore({ status: 'Published', publishedDomain: publishedUrl, domain: publishedUrl });
              setShowPublishModal(false);
              setVerifyStatus('idle');
            }}
            onClose={() => setShowPublishModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
