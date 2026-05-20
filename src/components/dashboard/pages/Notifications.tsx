'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ShoppingBag, Package, CreditCard, Settings, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import type { Notification } from '../../../hooks/useNotifications';

type FilterType = 'all' | 'unread' | 'order' | 'product' | 'payment' | 'system';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'unread',  label: 'Unread' },
  { key: 'order',   label: 'Orders' },
  { key: 'product', label: 'Products' },
  { key: 'payment', label: 'Payments' },
  { key: 'system',  label: 'System' },
];

const TYPE_ICON: Record<Notification['type'], React.ElementType> = {
  order:   ShoppingBag,
  product: Package,
  payment: CreditCard,
  system:  Settings,
};

const TYPE_COLOR: Record<Notification['type'], string> = {
  order:   'bg-blue-50 text-blue-600',
  product: 'bg-amber-50 text-amber-600',
  payment: 'bg-emerald-50 text-emerald-600',
  system:  'bg-slate-100 text-slate-500',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, markAsRead, markAllRead, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return n.unread;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    router.push(n.link);
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => {
          const count = f.key === 'unread'
            ? unreadCount
            : f.key === 'all'
            ? notifications.length
            : notifications.filter(n => n.type === f.key).length;

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
              }`}
            >
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Bell className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No notifications here</p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                  n.unread ? 'bg-blue-50/40' : ''
                } ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${TYPE_COLOR[n.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm text-slate-900 ${n.unread ? 'font-semibold' : 'font-medium'}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                </div>

                {/* Unread dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${n.unread ? 'bg-blue-500' : 'bg-transparent'}`} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
