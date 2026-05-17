'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag, Megaphone,
  BarChart3, Palette, Settings, ChevronDown, ChevronRight, Plus, Store,
  Menu, X, TrendingUp
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

function buildNavSections(pendingOrders: number, newProducts: number) {
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
      { icon: Palette, label: 'Appearance', path: '/dashboard/appearance' },
      { icon: Settings, label: 'Store Settings', path: '/dashboard/settings' },
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
  const { openUpgradeModal } = useAuth();
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Badge: orders Processing/Shipped = belum selesai; products dengan badge 'New'
  const pendingOrders = storeData.orders.filter(o => o.status === 'Processing').length;
  const newProducts = storeData.products.filter(p => p.badge === 'New').length;
  const navSections = buildNavSections(pendingOrders, newProducts);

  const isActive = (path: string) => pathname === path;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 flex-shrink-0">
        <Link href="/" className="flex items-center">
          {collapsed ? (
            <Image
              src="/logo-icon.png"
              alt="Storee"
              width={32}
              height={32}
              unoptimized
              className="w-8 h-8 object-contain"
            />
          ) : (
            <Image
              src="/logo-dark.png"
              alt="Storee"
              width={112}
              height={32}
              unoptimized
              className="h-8 w-auto"
              priority
            />
          )}
        </Link>
        <button
          onClick={onToggle}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{activeStore?.name || 'My Store'}</p>
                <p className="text-xs text-slate-500 truncate">{activeStore?.domain}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${storeMenuOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        <AnimatePresence>
          {storeMenuOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-1"
            >
              {stores.map(store => (
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
                  <span className="text-sm font-medium truncate">{store.name}</span>
                  {activeStore?.id === store.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
              <button
                onClick={() => { setStoreMenuOpen(false); router.push('/'); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
              >
                <div className="w-5 h-5 rounded border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3 h-3" />
                </div>
                <span className="text-sm">New Store</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(item => (
                <Link
                  key={item.label}
                  href={item.path || '#'}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    isActive(item.path || '')
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.path || '') ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 text-xs font-bold bg-emerald-500 text-white rounded-full flex items-center justify-center">
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
      {!collapsed && (
        <div className="px-3 py-4 border-t border-slate-100 flex-shrink-0">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-bold">Upgrade Plan</span>
            </div>
            <p className="text-xs text-emerald-100 mb-3">Unlock unlimited stores, custom domains & priority support</p>
            <button
              onClick={() => openUpgradeModal('Starter')}
              className="w-full py-2 bg-white text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Upgrade Now →
            </button>
          </div>
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
        {sidebarContent}
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
              className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 lg:hidden flex flex-col shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
