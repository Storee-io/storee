'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, Eye, Copy, Settings, HelpCircle, LogOut, ExternalLink, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
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

export default function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const [copied, setCopied] = useState(false);
  const { user, logout } = useAuth();
  const { activeStore } = useStore();
  const router = useRouter();

  const copyLink = () => {
    navigator.clipboard.writeText(`https://${activeStore?.domain || 'my-store.storee.co'}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const notifications = [
    { id: 1, title: 'New order received', desc: '#ORD-1042 — $299', time: '2 min ago', unread: true },
    { id: 2, title: 'Product low in stock', desc: 'Oak Dining Table — 8 left', time: '1 hr ago', unread: true },
    { id: 3, title: 'Payment confirmed', desc: '#ORD-1039 — $129', time: '3 hrs ago', unread: false },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block">
        <h1 className="text-lg font-bold text-slate-900">{activeStore?.name || 'Dashboard'}</h1>
        <p className="text-xs text-slate-500">{activeStore?.status === 'Published' ? '🟢 Live' : '🟡 Draft'} · {activeStore?.domain}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Preview store */}
        <Link
          href="/preview?from=/dashboard"
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview
        </Link>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Notifications</span>
              <span className="text-xs text-slate-500">2 unread</span>
            </div>
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${n.unread ? 'bg-blue-50/50' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.unread ? 'bg-blue-500' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.desc}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
            <div className="px-4 py-2.5 border-t border-slate-100 text-center">
              <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View all notifications</button>
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

            {/* Store link */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs text-slate-400 mb-2 font-medium">Your Store Link</p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                <a
                  href={`https://${activeStore?.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-xs text-emerald-600 hover:underline truncate flex items-center gap-1"
                >
                  {activeStore?.domain}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                <button onClick={copyLink} className="p-1 rounded hover:bg-slate-200 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Menu items */}
            <Link href="/dashboard/settings">
              <DropdownMenuItem className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600">
                <Settings className="w-4 h-4 text-slate-400" />
                Account Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              Help & Support
            </DropdownMenuItem>

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
