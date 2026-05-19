'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SYSTEM_PROMPT as DEFAULT_PROMPT } from '@/src/lib/claudePrompt';

type Tab = 'prompt' | 'model' | 'format' | 'history';

type HistoryEntry = {
  id: number;
  system_prompt: string;
  model: string;
  max_tokens: number;
  note: string | null;
  saved_at: string;
};

const MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-5',
  'claude-haiku-4-5',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SysconfigDashboard() {
  const router = useRouter();

  // State
  const [tab,          setTab]          = useState<Tab>('prompt');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model,        setModel]        = useState('claude-sonnet-4-6');
  const [maxTokens,    setMaxTokens]    = useState(4096);
  const [isDefault,    setIsDefault]    = useState(false);
  const [savedAt,      setSavedAt]      = useState<Date | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [dirty,        setDirty]        = useState(false);

  // Track changes
  const [origPrompt,    setOrigPrompt]    = useState('');
  const [origModel,     setOrigModel]     = useState('');
  const [origMaxTokens, setOrigMaxTokens] = useState(4096);

  // History state
  const [history,        setHistory]        = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId,     setExpandedId]     = useState<number | null>(null);
  const [reverting,      setReverting]      = useState<number | null>(null);
  const [deletingId,     setDeletingId]     = useState<number | null>(null);
  const [saveNote,       setSaveNote]       = useState('');

  // ── Load config ─────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/sysconfig/config');
    if (res.status === 401) { router.push('/sysconfig'); return; }
    const data = await res.json();
    setSystemPrompt(data.systemPrompt);
    setModel(data.model);
    setMaxTokens(data.maxTokens);
    setIsDefault(data.isDefault);
    if (data.savedAt) setSavedAt(new Date(data.savedAt));
    setOrigPrompt(data.systemPrompt);
    setOrigModel(data.model);
    setOrigMaxTokens(data.maxTokens);
    setLoading(false);
    setDirty(false);
  }, [router]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Track dirty state
  useEffect(() => {
    setDirty(
      systemPrompt !== origPrompt ||
      model        !== origModel  ||
      maxTokens    !== origMaxTokens
    );
  }, [systemPrompt, model, maxTokens, origPrompt, origModel, origMaxTokens]);

  // ── Load history ──────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/sysconfig/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
      }
    } catch { /* silent */ }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/sysconfig/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, model, maxTokens, note: saveNote || null }),
      });
      if (res.ok) {
        const now = new Date();
        setSavedAt(now);
        setIsDefault(false);
        setOrigPrompt(systemPrompt);
        setOrigModel(model);
        setOrigMaxTokens(maxTokens);
        setDirty(false);
        setSaveNote('');
        showToast('ok', 'Config saved — previous version archived');
      } else {
        showToast('err', 'Save failed — check Supabase connection');
      }
    } catch {
      showToast('err', 'Network error');
    }
    setSaving(false);
  };

  // ── Revert to history entry ───────────────────────────────────────────────────
  const revertTo = async (entry: HistoryEntry) => {
    if (!confirm(`Restore version from ${new Date(entry.saved_at).toLocaleString()}?\n\nThe current config will be auto-archived first.`)) return;
    setReverting(entry.id);
    try {
      const res = await fetch('/api/sysconfig/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });
      if (res.ok) {
        const data = await res.json();
        // Apply restored values to form
        setSystemPrompt(data.restored.systemPrompt);
        setModel(data.restored.model);
        setMaxTokens(data.restored.maxTokens);
        setOrigPrompt(data.restored.systemPrompt);
        setOrigModel(data.restored.model);
        setOrigMaxTokens(data.restored.maxTokens);
        setDirty(false);
        setSavedAt(new Date());
        setIsDefault(false);
        showToast('ok', 'Version restored successfully');
        loadHistory();  // refresh list
        setTab('prompt');
      } else {
        showToast('err', 'Revert failed');
      }
    } catch {
      showToast('err', 'Network error');
    }
    setReverting(null);
  };

  // ── Delete history entry ──────────────────────────────────────────────────────
  const deleteHistoryEntry = async (id: number) => {
    if (!confirm('Delete this history entry? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/sysconfig/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setHistory(prev => prev.filter(h => h.id !== id));
        showToast('ok', 'Entry deleted');
      } else {
        showToast('err', 'Delete failed');
      }
    } catch {
      showToast('err', 'Network error');
    }
    setDeletingId(null);
  };

  // ── Reset to default ─────────────────────────────────────────────────────────
  const resetToDefault = () => {
    if (!confirm('Reset system prompt to default? Your current edits will be lost.')) return;
    setSystemPrompt(DEFAULT_PROMPT);
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = async () => {
    await fetch('/api/sysconfig/logout', { method: 'POST' });
    router.push('/sysconfig');
  };

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading config…</p>
        </div>
      </div>
    );
  }

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl transition-all ${
          toast.type === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'ok'
            ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <span className="text-white font-bold text-sm">SysConfig</span>
            <span className="text-slate-600 text-sm mx-2">·</span>
            <span className="text-slate-400 text-sm">Storee Admin</span>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 ml-2">
            {isDefault && (
              <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                Using default
              </span>
            )}
            {dirty && (
              <span className="px-2.5 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5">
          {savedAt && (
            <div className="text-right hidden sm:block">
              <p className="text-slate-500 text-xs">Last saved</p>
              <p className="text-slate-400 text-xs font-mono">{formatDate(savedAt)} {formatTime(savedAt)}</p>
            </div>
          )}
          <div className="h-5 w-px bg-slate-800" />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/30 px-6">
        <div className="flex gap-0">
          {([
            { id: 'prompt'  as Tab, label: 'System Prompt',  icon: '📝' },
            { id: 'model'   as Tab, label: 'Model & Tokens', icon: '🤖' },
            { id: 'format'  as Tab, label: 'Message Format', icon: '📨' },
            { id: 'history' as Tab, label: 'Version History', icon: '🕐' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.id
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-6">

        {/* ────── System Prompt tab ────── */}
        {tab === 'prompt' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold">System Prompt</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Sent to Claude as the <code className="text-emerald-400 font-mono text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">system</code> message before every store generation request.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className="font-mono text-xs text-slate-600">
                  {systemPrompt.length.toLocaleString()} chars
                  &nbsp;·&nbsp;
                  ~{Math.round(systemPrompt.length / 4).toLocaleString()} tokens
                </span>
                <button
                  onClick={resetToDefault}
                  className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                >
                  Reset to default
                </button>
              </div>
            </div>

            <div className="relative">
              {/* Line gutter hint */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-800/40 rounded-l-xl border-r border-slate-700/50 pointer-events-none" />
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-14 pr-5 py-4 text-slate-200 text-sm font-mono leading-6 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 resize-none transition-all"
                spellCheck={false}
                placeholder="Enter system prompt…"
              />
            </div>

            {/* Save note */}
            <div className="mt-3">
              <input
                type="text"
                value={saveNote}
                onChange={e => setSaveNote(e.target.value)}
                placeholder="Optional note for this version (e.g. 'Added JSON escaping rule')"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 transition-all"
              />
            </div>

            {/* Quick reference */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Required fields', value: 'storeName, category, primaryColor, products' },
                { label: 'Valid categories', value: 'Fashion, Beauty, Coffee, Electronics, Furniture, Food' },
                { label: 'Valid layouts', value: 'minimal, bold, elegant, modern, playful' },
                { label: 'Products count', value: 'Exactly 6 (enforced in claudeApi.ts)' },
              ].map(item => (
                <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-1">{item.label}</p>
                  <p className="text-slate-300 text-xs font-mono leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────── Model & Tokens tab ────── */}
        {tab === 'model' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-white font-semibold mb-1">Model & Token Settings</h2>
            <p className="text-slate-500 text-sm mb-6">
              Controls which Claude model is used and the maximum output length.
            </p>

            <div className="space-y-6">
              {/* Model selector */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Model
                </label>
                <div className="space-y-2">
                  {MODELS.map(m => (
                    <label key={m} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                      model === m
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'border-transparent hover:bg-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="model"
                        value={m}
                        checked={model === m}
                        onChange={() => setModel(m)}
                        className="accent-emerald-500"
                      />
                      <span className="font-mono text-sm">{m}</span>
                      {m === 'claude-sonnet-4-6' && (
                        <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full">
                          Recommended
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Max tokens slider */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Max Output Tokens
                </label>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-white font-mono">{maxTokens.toLocaleString()}</span>
                  <span className="text-slate-500 text-sm">tokens</span>
                </div>
                <input
                  type="range"
                  min={1024}
                  max={8192}
                  step={256}
                  value={maxTokens}
                  onChange={e => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-emerald-500 mb-2"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>1,024 — Fast</span>
                  <span className="text-emerald-600">4,096 — Recommended</span>
                  <span>8,192 — Max</span>
                </div>
                <p className="text-slate-600 text-xs mt-3">
                  A full store JSON response typically uses ~1,800–2,400 tokens. 4,096 gives ample headroom.
                </p>
              </div>

              {/* Read-only info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '📐', label: 'Context Window',  value: '200K tokens' },
                  { icon: '⚡', label: 'Streaming',       value: 'Enabled' },
                  { icon: '💾', label: 'Prompt Cache',    value: 'Ephemeral (system)' },
                  { icon: '🌡️', label: 'Temperature',     value: '1 (API default)' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xl mb-1.5">{item.icon}</div>
                    <div className="text-white text-sm font-semibold">{item.value}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ────── Message Format tab ────── */}
        {tab === 'format' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-white font-semibold mb-1">Message Format</h2>
            <p className="text-slate-500 text-sm mb-6">
              How the final message is assembled before being sent to Claude.
            </p>

            {/* Flow diagram */}
            <div className="space-y-3 mb-6">
              {/* User input */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-800/50">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span className="text-sky-400 text-xs font-semibold uppercase tracking-wider">User Prompt</span>
                </div>
                <div className="px-4 py-3 font-mono text-sm text-sky-300">
                  {'{prompt}'}
                  <span className="text-slate-600 ml-2">← the text typed by the user in HeroSection</span>
                </div>
              </div>

              {/* Currency injection */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-800/50">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Currency Injection</span>
                  <span className="ml-auto text-slate-600 text-xs">Appended only if currency selected</span>
                </div>
                <div className="px-4 py-3 font-mono text-sm text-amber-300/80 leading-relaxed">
                  Currency: {'{currency.label}'} ({'{currency.code}'}, symbol: {'{currency.symbol}'}). Use realistic {'{currency.code}'} pricing for all products.
                </div>
              </div>

              {/* Language injection */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-800/50">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                  <span className="text-violet-400 text-xs font-semibold uppercase tracking-wider">Language Injection</span>
                  <span className="ml-auto text-slate-600 text-xs">Appended only if language selected</span>
                </div>
                <div className="px-4 py-3 font-mono text-sm text-violet-300/80 leading-relaxed">
                  Generate ALL text content (storeName, tagline, heroTitle, heroSubtitle, ctaText, navLinks, product names, descriptions, features, testimonials, FAQ, newsletter, promoBar, brandStory, trustBadges, collections, stats) in {'{language}'}. Only exception: keep category value in English.
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-slate-700 text-xl py-1">↓</div>

              {/* System message */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-800/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">System Message</span>
                  <span className="ml-auto font-mono text-slate-600 text-xs">cache_control: ephemeral</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-slate-500 text-xs mb-2">From "System Prompt" tab (editable above)</p>
                  <p className="font-mono text-xs text-slate-600 truncate">
                    {systemPrompt.slice(0, 120)}…
                  </p>
                </div>
              </div>
            </div>

            {/* Expected JSON schema */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-slate-300 text-sm font-semibold mb-3">Expected JSON Response Shape</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 font-mono text-xs">
                {[
                  { field: 'storeName',     note: 'string',               required: true  },
                  { field: 'tagline',       note: 'string',               required: true  },
                  { field: 'category',      note: 'Fashion|Beauty|…',     required: true  },
                  { field: 'primaryColor',  note: 'hex string',           required: true  },
                  { field: 'accentColor',   note: 'hex string',           required: true  },
                  { field: 'layoutStyle',   note: 'minimal|bold|…',       required: true  },
                  { field: 'heroTitle',     note: 'string',               required: true  },
                  { field: 'heroSubtitle',  note: 'string',               required: true  },
                  { field: 'ctaText',       note: 'string',               required: true  },
                  { field: 'navLinks',      note: 'string[]',             required: true  },
                  { field: 'collections',  note: '[{name, emoji}]',      required: true  },
                  { field: 'products',      note: '[…] × 6',              required: true  },
                  { field: 'features',      note: '[{icon,title,desc}]',  required: true  },
                  { field: 'testimonials',  note: '[{text,author,…}]',   required: true  },
                  { field: 'faq',           note: '[{q,a}] × 5',         required: false },
                  { field: 'stats',         note: '[{value,label}] × 3', required: false },
                  { field: 'promoBar',      note: 'string',               required: false },
                  { field: 'newsletter',    note: '{headline,subtext}',   required: false },
                  { field: 'trustBadges',   note: '[{icon,text}] × 4',   required: false },
                  { field: 'brandStory',    note: 'string',               required: false },
                ].map(row => (
                  <div key={row.field} className="flex items-center gap-2">
                    <span className={row.required ? 'text-emerald-400' : 'text-slate-600'}>
                      {row.required ? '●' : '○'}
                    </span>
                    <span className={row.required ? 'text-slate-300' : 'text-slate-600'}>
                      {row.field}
                    </span>
                    <span className="text-slate-700 truncate">{row.note}</span>
                  </div>
                ))}
              </div>
              <p className="text-slate-700 text-xs mt-4">● required &nbsp; ○ optional — defined in <code className="text-slate-500">src/lib/claudeApi.ts</code></p>
            </div>
          </div>
        )}
        {/* ────── Version History tab ────── */}
        {tab === 'history' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-white font-semibold">Version History</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Each save archives the previous config. Click Restore to roll back.
                </p>
              </div>
              <button
                onClick={loadHistory}
                disabled={historyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition-all disabled:opacity-40"
              >
                <svg className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-3">🕐</div>
                <p className="text-slate-400 font-medium">No history yet</p>
                <p className="text-slate-600 text-sm mt-1">Save your first config change to start tracking versions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry, idx) => {
                  const date    = new Date(entry.saved_at);
                  const isExp   = expandedId === entry.id;
                  const vNum    = history.length - idx;  // newest = highest number
                  return (
                    <div
                      key={entry.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all"
                    >
                      {/* Row header */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Version badge */}
                        <span className="flex-shrink-0 w-10 h-7 flex items-center justify-center bg-slate-800 rounded-lg text-xs font-mono font-bold text-slate-400">
                          v{vNum}
                        </span>

                        {/* Meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {entry.note && (
                              <span className="text-slate-200 text-sm font-medium truncate max-w-xs">
                                {entry.note}
                              </span>
                            )}
                            <span className="font-mono text-xs text-slate-500">
                              {formatDate(date)} {formatTime(date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="font-mono text-xs text-slate-600">{entry.model}</span>
                            <span className="text-slate-700 text-xs">·</span>
                            <span className="font-mono text-xs text-slate-600">{entry.max_tokens.toLocaleString()} tokens</span>
                            <span className="text-slate-700 text-xs">·</span>
                            <span className="font-mono text-xs text-slate-600">
                              {entry.system_prompt.length.toLocaleString()} chars
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setExpandedId(isExp ? null : entry.id)}
                            className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded-lg transition-all"
                          >
                            {isExp ? 'Hide' : 'Preview'}
                          </button>
                          <button
                            onClick={() => revertTo(entry)}
                            disabled={reverting === entry.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-all disabled:opacity-40"
                          >
                            {reverting === entry.id ? (
                              <span className="w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            )}
                            Restore
                          </button>
                          <button
                            onClick={() => deleteHistoryEntry(entry.id)}
                            disabled={deletingId === entry.id}
                            className="p-1.5 text-slate-700 hover:text-red-400 rounded-lg transition-colors disabled:opacity-40"
                            title="Delete this entry"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded prompt preview */}
                      {isExp && (
                        <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-3">
                          <pre className="text-slate-400 text-xs font-mono leading-5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {entry.system_prompt}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 px-6 py-3.5 flex items-center justify-between gap-4">
        <p className="text-slate-600 text-xs hidden sm:block">
          Changes to system prompt and model take effect on the <strong className="text-slate-500">next</strong> store generation request.
        </p>
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={loadConfig}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
          >
            Discard
          </button>
          <button
            onClick={saveConfig}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
