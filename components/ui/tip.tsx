import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TipProps {
  label: string;
  children: ReactNode;
  /** Which side the tooltip appears on. Default: 'bottom' */
  side?: 'top' | 'bottom';
  className?: string;
}

/**
 * Lightweight hover tooltip wrapper.
 * Renders as inline-flex so it doesn't break flex/grid layouts.
 */
export function Tip({ label, children, side = 'bottom', className }: TipProps) {
  return (
    <div className={cn('relative inline-flex group/tip', className)}>
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap',
          'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5',
          'text-xs font-medium text-slate-700 shadow-md',
          'opacity-0 group-hover/tip:opacity-100',
          'transition-opacity duration-150 delay-200',
          side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
        )}
      >
        {label}
      </span>
    </div>
  );
}
