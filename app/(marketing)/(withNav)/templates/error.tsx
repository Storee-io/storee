'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Couldn&apos;t load templates</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          Failed to load the template gallery. Check your connection and try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
