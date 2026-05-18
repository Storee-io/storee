'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Palette, Package, ImageIcon,
  Store as StoreIcon, CheckCircle2, Loader2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

const STEPS = [
  { label: 'Analyzing your prompt...', Icon: Sparkles },
  { label: 'Generating store design...', Icon: Palette },
  { label: 'Creating sample products...', Icon: Package },
  { label: 'Generating logo & banner...', Icon: ImageIcon },
  { label: 'Finalizing your store...', Icon: StoreIcon },
];

export default function GeneratingOverlay() {
  const { generationState } = useStore();

  const active = generationState?.active ?? false;
  const step   = generationState?.step   ?? 0;
  const prompt = generationState?.prompt ?? '';

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="generating-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center px-4"
        >
          {/* Animated brand icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="relative mb-8"
          >
            <div className="w-20 h-20 gradient-bg rounded-3xl flex items-center justify-center shadow-xl">
              <Loader2 className="w-9 h-9 text-white animate-spin" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-2xl font-bold text-slate-900 mb-2"
          >
            Building your store...
          </motion.h2>

          {/* Prompt */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-slate-400 text-center max-w-xs mb-10 leading-relaxed line-clamp-3"
          >
            {prompt}
          </motion.p>

          {/* Steps */}
          <div className="w-full max-w-sm space-y-3">
            {STEPS.map(({ label, Icon }, i) => {
              const completed = i < step;
              const isActive  = i === step;
              const pending   = i > step;

              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors duration-300 ${
                    completed || isActive ? 'bg-teal-50' : 'bg-slate-50'
                  }`}
                >
                  {completed && (
                    <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  )}
                  {isActive && (
                    <Loader2 className="w-5 h-5 text-teal-500 flex-shrink-0 animate-spin" />
                  )}
                  {pending && (
                    <Icon className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-semibold ${
                    completed || isActive ? 'text-teal-700' : 'text-slate-300'
                  }`}>
                    {label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
