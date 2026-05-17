'use client';

import Link from 'next/link';

export default function TemplatePreviewError() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 mb-4">Failed to load template.</p>
        <Link
          href="/templates"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Back to Templates
        </Link>
      </div>
    </div>
  );
}
