'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, Eye, Copy, Settings, HelpCircle, LogOut, ExternalLink, Check, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useNotifications } from '../../hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

/** Copy text to clipboard; falls back to execCommand for non-secure contexts. */
function safeClipboardWrite(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
  } else {
    execCommandCopy(text);
  }
}
function execCommandCopy(text: string) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  } catch { /* silent */ }
}

export default function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const { user, logout } = useAuth();
  const { activeStore, updateActiveStore } = useStore();
  const router = useRouter();

  const handleUnpublish = async () => {
    if (!activeStore?.domain || unpublishing) return;
    const subdomain = activeStore.domain.replace('.storee.io', '');
    setUnpublishing(true);
    try {
      await fetch('/api/publish-store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      });
      updateActiveStore({ status: 'Draft' });
    } finally {
      setUnpublishing(false);
    }
  };

  const copyLink = () => {
    safeClipboardWrite(`https://${activeStore?.domain || 'my-store.storee.io'}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { notifications, markAsRead, markAllRead, unreadCount } = useNotifications();

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-1.5 flex items-center justify-between flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="text-[15px] font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">{activeStore?.name || 'Dashboard'}</h1>

        {activeStore?.status === 'Published' ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer">
              {unpublishing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
              {unpublishing ? 'Unpublishing…' : 'Live'}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Store is live</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{activeStore.domain}</p>
              </div>
              <DropdownMenuItem
                onClick={handleUnpublish}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 cursor-pointer"
              >
                <EyeOff className="w-4 h-4" />
                Unpublish Store
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            Draft
          </span>
        )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Domain pill — only visible when store is Published */}
        {activeStore?.status === 'Published' && activeStore.domain && (
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-full overflow-hidden hover:border-slate-300 transition-colors">
            <a
              href={`https://${activeStore.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 hover:bg-slate-100 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-400" />
              <span className="text-xs text-slate-600 truncate max-w-[140px]">
                {activeStore.domain}
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
            </a>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            <button
              onClick={copyLink}
              className="px-2.5 py-1.5 hover:bg-slate-100 transition-colors flex-shrink-0"
              title="Copy link"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
        )}

        {/* Preview button */}
        <Link
          href={activeStore ? `/preview/${activeStore.id}?from=/dashboard` : '/preview?from=/dashboard'}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all"
        >
          <Eye className="w-4 h-4" />
          Preview
        </Link>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-slate-200 mx-0.5" />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
                {unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 ? (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Mark all as read
                </button>
              ) : (
                <span className="text-xs text-slate-400">All caught up</span>
              )}
            </div>
            {notifications.slice(0, 6).map(n => (
              <div
                key={n.id}
                onClick={() => { markAsRead(n.id); router.push(n.link); }}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${n.unread ? 'bg-blue-50/50' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.unread ? 'bg-blue-500' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className={`text-sm text-slate-900 ${n.unread ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                  <p className="text-xs text-slate-500">{n.desc}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
            <div className="px-4 py-2.5 border-t border-slate-100 text-center">
              <Link
                href="/dashboard/notifications"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                View all notifications
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700">{user?.name || 'User'}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-0">
            {/* User info */}
            <div className="px-4 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <Link href="/dashboard/account">
              <DropdownMenuItem className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600">
                <Settings className="w-4 h-4 text-slate-400" />
                Account Settings
              </DropdownMenuItem>
            </Link>
            <a href="mailto:support@storee.io" target="_blank" rel="noopener noreferrer">
              <DropdownMenuItem className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                Help & Support
              </DropdownMenuItem>
            </a>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => { logout(); router.push('/'); }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
