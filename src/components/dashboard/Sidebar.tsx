'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag, Megaphone,
  BarChart3, Palette, Settings, ChevronDown, Plus, Store,
  X, TrendingUp, PanelLeftClose, PanelLeftOpen, Truck, CreditCard, User, Bell, Globe, PenLine
} from 'lucide-react';
import Image from 'next/image';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  badge?: number;
  children?: { label: string; path: string; badge?: number }[];
}

function buildNavSections(pendingOrders: number, newProducts: number, activeStoreId?: string) {
  return [
  {
    label: 'STORE',
    items: [
      { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
      { icon: ShoppingBag, label: 'Orders', path: '/dashboard/orders', ...(pendingOrders > 0 ? { badge: pendingOrders } : {}) },
      { icon: Package, label: 'Products', path: '/dashboard/products', ...(newProducts > 0 ? { badge: newProducts } : {}) },
      { icon: Users, label: 'Customers', path: '/dashboard/customers' },
    ] as NavItem[],
  },
  {
    label: 'MARKETING',
    items: [
      { icon: Tag, label: 'Promotions', path: '/dashboard/promotions' },
      { icon: Megaphone, label: 'Campaigns', path: '/dashboard/campaigns' },
      { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
    ] as NavItem[],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { icon: PenLine,     label: 'Canvas',          path: activeStoreId ? `/canvas/${activeStoreId}` : '/canvas' },
      { icon: Palette,     label: 'Appearance',     path: '/dashboard/appearance' },
      { icon: Globe,       label: 'Domain',          path: '/dashboard/domain' },
      { icon: Truck,       label: 'Shipping',        path: '/dashboard/shipping' },
      { icon: CreditCard,  label: 'Payment',         path: '/dashboard/payment' },
      { icon: Settings,    label: 'Store Settings',   path: '/dashboard/settings' },
      { icon: Bell,        label: 'Notifications',    path: '/dashboard/notifications' },
      { icon: User,        label: 'Account',           path: '/dashboard/account' },
    ] as NavItem[],
  },
  ];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { stores, activeStore, setActiveStore, storeData } = useStore();
  // Only show real (non-demo) stores in the switcher list
  const DEMO_IDS = new Set(['store-1', 'store-2']);
  const realStores = stores.filter(s => !DEMO_IDS.has(s.id));
  const { openUpgradeModal } = useAuth();
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Badge: orders Processing/Shipped = belum selesai; products dengan badge 'New'
  const pendingOrders = storeData.orders.filter(o => o.status === 'Processing').length;
  const newProducts = storeData.products.filter(p => p.badge === 'New').length;
  const navSections = buildNavSections(pendingOrders, newProducts, activeStore?.id);

  const isActive = (path: string) => pathname === path || (path.startsWith('/canvas/') && pathname.startsWith('/canvas/'));

  const renderSidebarContent = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-200 flex-shrink-0">
        {!isCollapsed && (
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-dark.png"
              alt="Storee"
              width={112}
              height={32}
              unoptimized
              className="h-5 w-auto"
              priority
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          className={`hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Store switcher */}
      <div className="px-3 py-3 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={() => setStoreMenuOpen(!storeMenuOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: activeStore?.primaryColor || '#10b981' }}
          >
            <Store className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{activeStore?.name || 'My Store'}</p>
                {activeStore?.status === 'Published' && activeStore.domain
                  ? <p className="text-xs text-slate-500 truncate">{activeStore.domain}</p>
                  : <p className="text-xs text-amber-500 font-medium">Draft</p>
                }
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${storeMenuOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        <AnimatePresence>
          {storeMenuOpen && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden"
            >
              <div
                className="space-y-1 max-h-60 overflow-y-auto"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
              >
              {realStores.length === 0 && activeStore ? (
                /* No real stores — show the demo/fallback store so header & list are consistent */
                <div className="px-3 py-2 flex items-center gap-3">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: activeStore.primaryColor }}>
                    {activeStore.name[0]}
                  </div>
                  <span className="text-sm font-medium text-slate-600 truncate flex-1">{activeStore.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Demo</span>
                </div>
              ) : (
                realStores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => { setActiveStore(store); setStoreMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      activeStore?.id === store.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: store.primaryColor }}>
                      {store.name[0]}
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{store.name}</span>
                    {store.status === 'Published' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">LIVE</span>
                    )}
                  </button>
                ))
              )}
              </div>{/* end scrollable store list */}
              <button
                onClick={() => { setStoreMenuOpen(false); router.push('/'); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
              >
                <div className="w-5 h-5 rounded border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3 h-3" />
                </div>
                <span className="text-sm">New Store</span>
              </button>
              <div className="pt-2 mt-1 border-t border-slate-100">
                <button
                  onClick={() => { setStoreMenuOpen(false); router.push('/stores'); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-xs font-medium">View all stores</span>
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map(section => (
          <div key={section.label}>
            {!isCollapsed && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(item => (
                <Link
                  key={item.label}
                  href={item.path || '#'}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    isActive(item.path || '')
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.path || '') ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 text-xs font-bold bg-emerald-500 text-white rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Upgrade CTA */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={() => openUpgradeModal('Starter')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white hover:opacity-90 transition-opacity"
          >
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-xs font-bold leading-none">Upgrade Plan</p>
              <p className="text-[10px] text-emerald-100 mt-0.5 truncate">Unlock all features →</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 overflow-hidden z-30"
      >
        {renderSidebarContent(collapsed)}
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 lg:hidden flex flex-col"
            >
              {renderSidebarContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
