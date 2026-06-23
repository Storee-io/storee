'use client';

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />
  );
}

export function StatCardSkeleton({ label = 'Loading...', icon: Icon, iconBg = 'bg-slate-50', iconColor = 'text-slate-400' }: { label?: string; icon?: React.ElementType; iconBg?: string; iconColor?: string } = {}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 min-h-[140px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        {Icon && <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>}
      </div>
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className={`h-5 ${i === 0 ? 'w-40' : i === cols - 1 ? 'w-20' : 'w-28'}`} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </tbody>
  );
}

export function ChartSkeleton({ height = 'h-48' }: { height?: string }) {
  return (
    <div className={cn('w-full rounded-xl bg-slate-100 animate-pulse flex items-end gap-1 px-4 pb-4', height)}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-slate-200 rounded-t"
          style={{ height: `${30 + Math.sin(i) * 20 + (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
}
