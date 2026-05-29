'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useStore } from '@/src/context/StoreContext';
import PreviewShell from '@/src/components/preview/PreviewShell';

// This page is used for dashboard → preview (/preview?from=/dashboard).
// AI-generated stores get their own unique URL: /preview/[storeId]
export default function PreviewPage() {
  const { generatedStore, activeStore } = useStore();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const store = generatedStore || activeStore;

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <PreviewShell store={store} from={from} />;
}
