'use client';

import { useRef, useEffect, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RotateCcw, X, Flag, CheckCircle } from 'lucide-react';
import type { HistorySnapshot } from '../../types/history';

interface Props {
  snapshots: HistorySnapshot[];
  currentIndex: number;
  onRevert: (index: number) => void;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Labels are stored as "Section — Action description" (see EditSpan commitEdit).
// Split them so the section renders as a scannable badge.
function parseLabel(label: string): { section: string | null; action: string } {
  const sep = label.indexOf(' — ');
  if (sep === -1) return { section: null, action: label };
  return { section: label.slice(0, sep), action: label.slice(sep + 3) };
}

export default function HistoryPanel({ snapshots, currentIndex, onRevert, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const currentItemRef = useRef<HTMLDivElement>(null);

  // Re-render every 30s so the relative timestamps ("2m ago") stay accurate
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Scroll current item into view on open
  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Show snapshots newest-first
  const reversedSnapshots = [...snapshots].reverse();
  const reversedCurrentIndex = snapshots.length - 1 - currentIndex;

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Version History</span>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5 leading-none">
            {snapshots.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Snapshot list */}
      <div className="overflow-y-auto max-h-80 py-1.5">
        {reversedSnapshots.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            No history yet. Start editing to create versions.
          </div>
        ) : (
          reversedSnapshots.map((snap, revIdx) => {
            const isCurrent = revIdx === reversedCurrentIndex;
            const isInitial = revIdx === reversedSnapshots.length - 1;
            const { section, action } = isInitial
              ? { section: null, action: 'Initial state' }
              : parseLabel(snap.metadata.label ?? 'Updated');

            return (
              <div
                key={snap.metadata.timestamp}
                ref={isCurrent ? currentItemRef : undefined}
                className={`group relative flex items-stretch gap-3 px-4 py-2.5 transition-colors cursor-default ${
                  isCurrent
                    ? 'bg-emerald-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Timeline dot + connecting line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                    isCurrent ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  {revIdx < reversedSnapshots.length - 1 && (
                    <div className="w-px flex-1 bg-slate-200 mt-1" />
                  )}
                </div>

                {/* Content — natural height, max 2 lines for the action text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium break-words ${
                    isInitial ? 'flex items-center gap-1' : 'line-clamp-2'
                  } ${isCurrent ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {isInitial && <Flag className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />}
                    {section && (
                      <span className={`inline-block text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 leading-none mr-1.5 align-middle ${
                        isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {section}
                      </span>
                    )}
                    {action}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    {isCurrent && (
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    )}
                    <span>
                      {formatRelativeTime(snap.metadata.timestamp)}
                      {' · '}
                      {formatTime(snap.metadata.timestamp)}
                    </span>
                  </p>
                </div>

                {/* Gradient + Revert button — absolute overlay, zero reflow */}
                {!isCurrent && (
                  <>
                    {/* Gradient fade so text behind button stays readable */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: isCurrent
                          ? 'linear-gradient(to right, transparent, rgb(240 253 250))'
                          : 'linear-gradient(to right, transparent, rgb(249 250 251))',
                      }}
                    />
                    <button
                      onClick={() => {
                        const originalIndex = snapshots.length - 1 - revIdx;
                        onRevert(originalIndex);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all opacity-0 group-hover:opacity-100"
                      style={{ boxShadow: '-12px 0 16px 8px rgb(248 250 252)' }}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Revert
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
        <p className="text-[10px] text-slate-400 text-center">
          Versions auto-saved every 5s · Max 50 versions
        </p>
      </div>
    </motion.div>
  );
}
