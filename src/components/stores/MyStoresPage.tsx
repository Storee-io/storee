'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Globe, Trash2, Plus, TrendingUp, Package,
  AlertTriangle, Rocket, ArrowLeft, Settings, ShoppingBag,
  Eye, RotateCcw, CloudOff, MoreHorizontal, PenLine,
} from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/src/context/StoreContext';
import { useRouter } from 'next/navigation';
import PublishModal from '@/src/components/preview/PublishModal';
import UnpublishModal from '@/src/components/preview/UnpublishModal';
import type { Store as StoreType } from '@/src/context/StoreContext';

const DEMO_IDS = new Set(['store-1', 'store-2']);

export default function MyStoresPage() {
  const { stores, deleteStore, updateActiveStore, setActiveStore, isLoadingStores } = useStore();
  const realStores = stores.filter(s => !DEMO_IDS.has(s.id));
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null);
  const [publishStore, setPublishStore]     = useState<StoreType | null>(null);
  const [unpublishStore, setUnpublishStore] = useState<StoreType | null>(null);
  const [openMenuId, setOpenMenuId]         = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close overflow menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const openPublish = (store: StoreType) => {
    setActiveStore(store);
    setPublishStore(store);
  };

  const handlePublishComplete = (subdomain: string) => {
    if (!publishStore) return;
    setActiveStore(publishStore);
    updateActiveStore({
      status: 'Published',
      domain: subdomain,
      publishedDomain: publishStore.publishedDomain ?? subdomain.replace('.storee.io', ''),
    });
    setPublishStore(null);
  };

  const handleUnpublishConfirm = () => {
    if (!unpublishStore) return;
    setActiveStore(unpublishStore);
    updateActiveStore({ status: 'Draft' });
    setUnpublishStore(null);
  };

  const handleDelete = async (storeId: string) => {
    setDeletingId(storeId);
    await deleteStore(storeId);
    setConfirmDelete(null);
    setDeletingId(null);
  };

  const handleManage = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) { setActiveStore(store); router.push('/dashboard'); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoadingStores) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading your stores…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="w-px h-5 bg-slate-200" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Stores</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {realStores.length > 0
                  ? `${realStores.length} store${realStores.length !== 1 ? 's' : ''} in your account`
                  : 'Create your first AI-powered store'}
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white gradient-bg rounded-xl hover:opacity-90 transition-opacity shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Store
          </Link>
        </div>

        {/* ── Empty state ── */}
        {realStores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center mb-5">
              <ShoppingBag className="w-9 h-9 text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">No stores yet</h2>
            <p className="text-slate-400 text-sm mb-7 max-w-xs leading-relaxed">
              Describe what you want to sell and our AI will build a complete store in seconds.
            </p>
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white gradient-bg rounded-xl hover:opacity-90 transition-opacity shadow-md"
            >
              <Rocket className="w-4 h-4" />
              Build my first store
            </Link>
          </div>
        )}

        {/* ── Store grid ── */}
        {realStores.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {realStores.map(store => {
                const isPublished = store.status === 'Published';
                const color = store.primaryColor ?? '#10b981';

                return (
                  <motion.div
                    key={store.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                  >
                    {/* Color banner */}
                    <div className="h-1.5 w-full flex-shrink-0" style={{ background: color }} />

                    <div className="p-5 flex flex-col flex-1">

                      {/* ── Header: icon + info + status + delete ── */}
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}18` }}
                        >
                          <Store className="w-5 h-5" style={{ color }} />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Name + status badge on same line */}
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-800 truncate leading-tight">{store.name}</h3>
                            {isPublished ? (
                              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-500 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Draft
                              </span>
                            )}
                          </div>
                          {/* Domain — only if ever published */}
                          {(isPublished || store.publishedDomain) ? (
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <Globe className="w-3 h-3 flex-shrink-0" />
                              {store.publishedDomain
                                ? `${store.publishedDomain}.storee.io`
                                : store.domain}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-300 mt-0.5">Not published yet</p>
                          )}
                        </div>

                        {/* ··· overflow menu only */}
                        <div className="flex items-center flex-shrink-0">

                          {/* ··· overflow menu */}
                          <div className="relative" ref={openMenuId === store.id ? menuRef : undefined}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === store.id ? null : store.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                              {openMenuId === store.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden"
                                >
                                  <button
                                    onClick={() => { setOpenMenuId(null); setConfirmDelete(store.id); }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete store
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      {/* ── Stats ── */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-50 rounded-xl p-2.5">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Revenue</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700">
                            {store.currency?.symbol ?? '$'}{(store.revenue ?? 0).toLocaleString('en-US')}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Orders</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700">{(store.orders ?? 0).toLocaleString('en-US')}</p>
                        </div>
                      </div>

                      {/* ── Actions ── */}
                      <div className="mt-auto pt-3 border-t border-slate-100 space-y-2">
                        {/* Row 1: Editor (primary) + Preview */}
                        <div className="flex gap-2">
                          <Link
                            href={`/editor/${store.id}?from=/stores`}
                            onClick={() => setActiveStore(store)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                            style={{ background: color }}
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            Editor
                          </Link>
                          <Link
                            href={`/preview/${store.id}?from=/stores`}
                            onClick={() => setActiveStore(store)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-xs">Preview</span>
                          </Link>
                        </div>

                        {/* Row 2: Manage (dashboard) + Publish/Republish/Unpublish */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleManage(store.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Dashboard
                          </button>

                          {isPublished ? (
                            <button
                              onClick={() => setUnpublishStore(store)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 border border-slate-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <CloudOff className="w-3.5 h-3.5" />
                              Unpublish
                            </button>
                          ) : store.publishedDomain ? (
                            <button
                              onClick={() => openPublish(store)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Republish
                            </button>
                          ) : (
                            <button
                              onClick={() => openPublish(store)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                              <Rocket className="w-3.5 h-3.5" />
                              Publish
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Publish / Republish Modal ── */}
      <AnimatePresence>
        {publishStore && (
          <PublishModal
            store={publishStore}
            onPublish={handlePublishComplete}
            onClose={() => setPublishStore(null)}
            {...(publishStore.publishedDomain
              ? { fixedSubdomain: publishStore.publishedDomain }
              : {})}
          />
        )}
      </AnimatePresence>

      {/* ── Unpublish Confirmation Modal ── */}
      <AnimatePresence>
        {unpublishStore && (
          <UnpublishModal
            store={unpublishStore}
            onConfirm={handleUnpublishConfirm}
            onClose={() => setUnpublishStore(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ── */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-[340px] max-w-[90vw]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Delete Store</h3>
                  <p className="text-xs text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-5">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-slate-800">
                  {stores.find(s => s.id === confirmDelete)?.name}
                </span>
                ? All store data will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deletingId === confirmDelete}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60"
                >
                  {deletingId === confirmDelete ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
