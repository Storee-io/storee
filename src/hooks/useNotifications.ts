'use client';

import { useState, useEffect } from 'react';

export interface Notification {
  id: number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  link: string;
  type: 'order' | 'product' | 'payment' | 'system';
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, title: 'New order received',      desc: '#ORD-1042 — $299',           time: '2 min ago',  unread: true,  link: '/dashboard/orders',   type: 'order' },
  { id: 2, title: 'Product low in stock',    desc: 'Oak Dining Table — 8 left',  time: '1 hr ago',   unread: true,  link: '/dashboard/products',  type: 'product' },
  { id: 3, title: 'Payment confirmed',       desc: '#ORD-1039 — $129',           time: '3 hrs ago',  unread: false, link: '/dashboard/orders',   type: 'payment' },
  { id: 4, title: 'New order received',      desc: '#ORD-1038 — $549',           time: '5 hrs ago',  unread: false, link: '/dashboard/orders',   type: 'order' },
  { id: 5, title: 'Product low in stock',    desc: 'Minimal Chair — 3 left',     time: '8 hrs ago',  unread: false, link: '/dashboard/products',  type: 'product' },
  { id: 6, title: 'Payment confirmed',       desc: '#ORD-1035 — $89',            time: '1 day ago',  unread: false, link: '/dashboard/orders',   type: 'payment' },
  { id: 7, title: 'New order received',      desc: '#ORD-1031 — $199',           time: '2 days ago', unread: false, link: '/dashboard/orders',   type: 'order' },
  { id: 8, title: 'System maintenance',      desc: 'Scheduled maintenance done', time: '3 days ago', unread: false, link: '/dashboard',           type: 'system' },
];

const STORAGE_KEY = 'storee_notifications';

function loadNotifications(): Notification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

function saveNotifications(data: Notification[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function useNotifications() {
  // Seed synchronously from localStorage so the very first client render already
  // shows the correct unread count — no 0 → N blink on refresh. The server seeds
  // from INITIAL_NOTIFICATIONS (no localStorage), which matches an untouched client;
  // for a client that has marked items read, the effect below reconciles after
  // hydration (badge has suppressHydrationWarning so no console noise).
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications());

  useEffect(() => {
    setNotifications(loadNotifications());
  }, []);

  const update = (data: Notification[]) => {
    setNotifications(data);
    saveNotifications(data);
  };

  const markAsRead = (id: number) => {
    update(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const markAllRead = () => {
    update(notifications.map(n => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return { notifications, markAsRead, markAllRead, unreadCount };
}
