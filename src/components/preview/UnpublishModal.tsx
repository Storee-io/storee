'use client';

import { motion } from 'framer-motion';
import { X, Globe, AlertTriangle } from 'lucide-react';
import type { Store } from '@/src/context/StoreContext';

interface UnpublishModalProps {
  store: Store;
  onConfirm: () => void;
  onClose: () => void;
}

export default function UnpublishModal({ store, onConfirm, onClose }: UnpublishModalProps) {
  const domain = store.publishedDomain
    ? `${store.publishedDomain}.storee.io`
    : store.domain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Unpublish Store?</h2>
                <p className="text-xs text-slate-500 mt-0.5">This will take your store offline</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Domain pill */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
            <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm font-mono text-slate-600 truncate">{domain}</span>
          </div>

          <p className="text-sm text-slate-500 mb-6">
            Your store <span className="font-semibold text-slate-700">{store.name}</span> will be set back to{' '}
            <span className="font-semibold text-slate-700">Draft</span> and will no longer be accessible to the public.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
            >
              Yes, Unpublish
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
