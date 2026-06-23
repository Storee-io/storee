'use client';

import { useStore } from '../../context/StoreContext';
import { Skeleton } from './ui/Skeleton';
import type { ReactNode } from 'react';

interface DashboardContentLoaderProps {
  children: ReactNode;
}

export function DashboardContentLoader({ children }: DashboardContentLoaderProps) {
  const { isLoadingActiveStore } = useStore();

  // Show full skeleton while store is loading
  if (isLoadingActiveStore) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-4" />

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 min-h-[140px] flex flex-col justify-between">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-2" />
              <div>
                <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 h-[300px] bg-slate-100 animate-pulse" />
          <div className="bg-white rounded-2xl p-6 border border-slate-100 h-[300px] bg-slate-100 animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-2xl border border-slate-200/60 overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-3 bg-slate-200 rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Render actual content when store is ready
  return <>{children}</>;
}
