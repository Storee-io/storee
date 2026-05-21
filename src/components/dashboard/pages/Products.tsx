'use client';

import { useState, useMemo } from 'react';
import {
  Search, Plus, Edit3, Trash2, Copy, ChevronUp, ChevronDown,
  ChevronsUpDown, Package, TrendingUp, DollarSign, AlertTriangle,
  ChevronLeft, ChevronRight, Save, ArrowLeft, BarChart2, Tag,
  ShoppingCart, Archive,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { makePriceFmt } from '../../../lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardProduct } from '../../../data/storeDataGenerator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function stockLevel(stock: number): 'critical' | 'low' | 'ok' {
  if (stock <= 5) return 'critical';
  if (stock <= 20) return 'low';
  return 'ok';
}

const STOCK_CONFIG = {
  critical: { dot: 'bg-red-500', label: 'Critical', text: 'text-red-600 font-semibold', badge: 'bg-red-100 text-red-600' },
  low:      { dot: 'bg-amber-400', label: 'Low',    text: 'text-amber-600 font-semibold', badge: 'bg-amber-100 text-amber-600' },
  ok:       { dot: 'bg-emerald-500', label: '',     text: 'text-slate-700', badge: '' },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Apparel': 'bg-purple-100 text-purple-700',
  'Accessories': 'bg-blue-100 text-blue-700',
  'Footwear': 'bg-pink-100 text-pink-700',
  'Coffee': 'bg-amber-100 text-amber-700',
  'Drinkware': 'bg-cyan-100 text-cyan-700',
  'Food': 'bg-orange-100 text-orange-700',
  'Electronics': 'bg-indigo-100 text-indigo-700',
  'Home': 'bg-teal-100 text-teal-700',
  'Beauty': 'bg-rose-100 text-rose-700',
  'Bags': 'bg-violet-100 text-violet-700',
  'Tops': 'bg-sky-100 text-sky-700',
  'Dresses': 'bg-fuchsia-100 text-fuchsia-700',
  'Bottoms': 'bg-emerald-100 text-emerald-700',
  'Outerwear': 'bg-slate-200 text-slate-700',
  'Jewelry': 'bg-yellow-100 text-yellow-700',
  'Sports': 'bg-lime-100 text-lime-700',
  'Books': 'bg-orange-100 text-orange-700',
  'Furniture': 'bg-stone-100 text-stone-700',
  'Toys': 'bg-red-100 text-red-700',
};

function categoryClass(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600';
}

type SortKey = 'name' | 'price' | 'stock' | 'sales' | 'revenue' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'All' | 'Active' | 'Draft';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }: {
  icon: React.ElementType; label: string; value: string; sub?: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Sort Icon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 ml-1 flex-shrink-0" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-emerald-500 ml-1 flex-shrink-0" />
    : <ChevronDown className="w-3.5 h-3.5 text-emerald-500 ml-1 flex-shrink-0" />;
}

// ── Status Toggle ─────────────────────────────────────────────────────────────

function StatusToggle({ status, onChange }: { status: 'Active' | 'Draft'; onChange: () => void }) {
  const isActive = status === 'Active';
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(); }}
      title={`Switch to ${isActive ? 'Draft' : 'Active'}`}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ── Product Detail / Edit (full screen) ──────────────────────────────────────

interface ProductDetailProps {
  product: DashboardProduct;
  fmtPrice: (n: number) => string;
  onBack: () => void;
  onSave: (updated: DashboardProduct) => void;
}

function ProductDetail({ product, fmtPrice, onBack, onSave }: ProductDetailProps) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [category, setCategory] = useState(product.category);
  const [badge, setBadge] = useState(product.badge ?? '');

  const level = stockLevel(product.stock);
  const { dot, label: stockLabel, badge: stockBadge } = STOCK_CONFIG[level];

  function buildUpdated(status: 'Active' | 'Draft'): DashboardProduct {
    return {
      ...product,
      name: name.trim() || product.name,
      price: Math.max(0, Number(price) || product.price),
      stock: Math.max(0, Number(stock) || product.stock),
      category: category.trim() || product.category,
      badge: badge.trim() || undefined,
      status,
    };
  }

  const isActive = product.status === 'Active';

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Products
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{product.name}</span>
        <span className={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {product.status}
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

          {/* Top: Image + stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Image card */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="aspect-square bg-slate-50">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23f1f5f9'/%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-400 font-mono">{product.id}</p>
                {product.badge && (
                  <span className="mt-2 inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{product.badge}</span>
                )}
              </div>
            </div>

            {/* Performance stats */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {[
                { label: 'Total Sales', value: String(product.sales), icon: ShoppingCart, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', sub: 'units sold' },
                { label: 'Revenue',     value: fmtPrice(product.price * product.sales), icon: DollarSign, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', sub: 'total earned' },
                { label: 'Stock',       value: String(product.stock), icon: Archive, iconBg: level === 'critical' ? 'bg-red-50' : level === 'low' ? 'bg-amber-50' : 'bg-slate-50', iconColor: level === 'critical' ? 'text-red-500' : level === 'low' ? 'text-amber-500' : 'text-slate-400', sub: stockLabel || 'in stock' },
                { label: 'Price',       value: fmtPrice(product.price), icon: Tag, iconBg: 'bg-purple-50', iconColor: 'text-purple-500', sub: 'per unit' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                    <div className={`w-8 h-8 ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Edit fields */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Product Details</p>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Product Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  placeholder="Product name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Stock</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <input
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="e.g. Apparel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Badge <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="e.g. New, Sale"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>

      {/* Sticky CTA bar */}
      <div className="flex-shrink-0 bg-white border-t border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            onClick={onBack}
          >
            Cancel
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            onClick={() => { onSave(buildUpdated('Draft')); onBack(); }}
          >
            <Archive className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            className="gradient-bg hover:opacity-90 text-white font-semibold"
            onClick={() => { onSave(buildUpdated('Active')); onBack(); }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Products() {
  const { storeData, activeStore } = useStore();

  const [localProducts, setLocalProducts] = useState<DashboardProduct[]>(() => [...storeData.products]);
  const [editProduct, setEditProduct] = useState<DashboardProduct | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────

  function updateProduct(updated: DashboardProduct) {
    setLocalProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  }

  function toggleStatus(id: string) {
    setLocalProducts(prev => prev.map(p =>
      p.id === id ? { ...p, status: p.status === 'Active' ? 'Draft' : 'Active' } : p
    ));
  }

  function duplicateProduct(id: string) {
    const source = localProducts.find(p => p.id === id);
    if (!source) return;
    const copy: DashboardProduct = { ...source, id: `P${Date.now()}`, name: `${source.name} (Copy)`, status: 'Draft', sales: 0 };
    setLocalProducts(prev => {
      const idx = prev.findIndex(p => p.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function deleteProduct(id: string) {
    setLocalProducts(prev => prev.filter(p => p.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    setDeleteTarget(null);
  }

  function bulkSetStatus(status: 'Active' | 'Draft') {
    setLocalProducts(prev => prev.map(p => selected.has(p.id) ? { ...p, status } : p));
    setSelected(new Set());
  }

  function bulkDelete() {
    setLocalProducts(prev => prev.filter(p => !selected.has(p.id)));
    setSelected(new Set());
  }

  // ── Derived (ALL hooks must come before any early return) ────────────────────

  const categories = useMemo(() => {
    const cats = Array.from(new Set(localProducts.map(p => p.category))).sort();
    return ['All', ...cats];
  }, [localProducts]);

  const activeCount  = localProducts.filter(p => p.status === 'Active').length;
  const draftCount   = localProducts.filter(p => p.status === 'Draft').length;
  const stockValue   = localProducts.reduce((a, p) => a + p.price * p.stock, 0);
  const totalRevenue = localProducts.reduce((a, p) => a + p.price * p.sales, 0);

  const fmt      = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtPrice = makePriceFmt(activeStore?.currency?.code ?? 'USD');

  const filtered = useMemo(() => {
    let list = [...localProducts];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All') list = list.filter(p => p.category === categoryFilter);
    if (statusFilter !== 'All')   list = list.filter(p => p.status === statusFilter);

    list.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortKey === 'revenue')      { va = a.price * a.sales; vb = b.price * b.sales; }
      else if (sortKey === 'name')    { va = a.name; vb = b.name; }
      else if (sortKey === 'status')  { va = a.status; vb = b.status; }
      else { va = a[sortKey]; vb = b[sortKey]; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? va - (vb as number) : (vb as number) - va;
    });
    return list;
  }, [localProducts, search, categoryFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pageItems  = filtered.slice(pageStart, pageStart + pageSize);

  function handleFilterChange(fn: () => void) { fn(); setPage(1); setSelected(new Set()); }
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }
  function toggleSelectAll() {
    if (pageItems.every(p => selected.has(p.id))) {
      const n = new Set(selected); pageItems.forEach(p => n.delete(p.id)); setSelected(n);
    } else {
      const n = new Set(selected); pageItems.forEach(p => n.add(p.id)); setSelected(n);
    }
  }
  function toggleSelect(id: string) {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  }
  const allPageSelected  = pageItems.length > 0 && pageItems.every(p => selected.has(p.id));
  const somePageSelected = pageItems.some(p => selected.has(p.id));

  // ── Full-screen detail view (after all hooks) ─────────────────────────────────

  if (editProduct) {
    const live = localProducts.find(p => p.id === editProduct.id) ?? editProduct;
    return (
      <ProductDetail
        product={live}
        fmtPrice={fmtPrice}
        onBack={() => setEditProduct(null)}
        onSave={updated => { updateProduct(updated); setEditProduct(null); }}
      />
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="text-slate-500 text-sm mt-0.5">{localProducts.length} products in your store</p>
        </div>
        <Button className="gradient-bg hover:opacity-90 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />Add Product
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Total Products"  value={String(localProducts.length)} sub={`${activeCount} active · ${draftCount} draft`}            iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard icon={TrendingUp}    label="Active Products" value={String(activeCount)}           sub={localProducts.length ? `${Math.round(activeCount / localProducts.length * 100)}% of catalog` : '—'} iconBg="bg-blue-50"    iconColor="text-blue-600"    />
        <StatCard icon={AlertTriangle} label="Stock Value"     value={fmtPrice(stockValue)}          sub={`${localProducts.filter(p => p.stock <= 5).length} critical`} iconBg="bg-amber-50"  iconColor="text-amber-600"   />
        <StatCard icon={DollarSign}    label="Total Revenue"   value={fmtPrice(totalRevenue)}        sub="from all product sales"                                   iconBg="bg-purple-50" iconColor="text-purple-600"  />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Active', 'Draft'] as StatusFilter[]).map(s => {
            const count = s === 'All' ? localProducts.length : s === 'Active' ? activeCount : draftCount;
            return (
              <button key={s} onClick={() => handleFilterChange(() => setStatusFilter(s))}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s}
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${statusFilter === s ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input value={search} onChange={e => handleFilterChange(() => setSearch(e.target.value))} placeholder="Search by name, category, or ID..."
              className="pl-9 h-9 rounded-xl bg-white border-slate-200/60 text-sm placeholder:text-slate-400 focus-visible:ring-emerald-400/40 focus-visible:border-emerald-400" />
          </div>
          <select value={categoryFilter} onChange={e => handleFilterChange(() => setCategoryFilter(e.target.value))}
            className="h-9 rounded-xl bg-white border border-slate-200/60 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 cursor-pointer">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-sm font-medium text-emerald-800">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={() => bulkSetStatus('Active')}>Set Active</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={() => bulkSetStatus('Draft')}>Set Draft</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={bulkDelete}>Delete Selected</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => setSelected(new Set())}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Delete Product?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">
              <span className="font-semibold">{localProducts.find(p => p.id === deleteTarget)?.name}</span> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteProduct(deleteTarget)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-10 pl-4">
                <input type="checkbox" checked={allPageSelected} ref={el => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                  onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-emerald-500" />
              </TableHead>
              <TableHead><button onClick={() => toggleSort('name')} className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors">Product <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} /></button></TableHead>
              <TableHead>Category</TableHead>
              <TableHead><button onClick={() => toggleSort('price')} className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors">Price <SortIcon col="price" sortKey={sortKey} sortDir={sortDir} /></button></TableHead>
              <TableHead><button onClick={() => toggleSort('stock')} className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors">Stock <SortIcon col="stock" sortKey={sortKey} sortDir={sortDir} /></button></TableHead>
              <TableHead><button onClick={() => toggleSort('sales')} className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors">Sales <SortIcon col="sales" sortKey={sortKey} sortDir={sortDir} /></button></TableHead>
              <TableHead><button onClick={() => toggleSort('revenue')} className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors">Revenue <SortIcon col="revenue" sortKey={sortKey} sortDir={sortDir} /></button></TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((product: DashboardProduct) => {
                const level = stockLevel(product.stock);
                const { dot, label: stockLabel, text: stockText, badge: sBadge } = STOCK_CONFIG[level];
                const revenue    = product.price * product.sales;
                const isSelected = selected.has(product.id);

                return (
                  <TableRow key={product.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer group ${isSelected ? 'bg-emerald-50/50' : ''}`}
                    onClick={() => setEditProduct(product)}
                  >
                    <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(product.id)} className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-emerald-500" />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.name} className="w-11 h-11 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                          onError={e => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23f1f5f9'/%3E%3C/svg%3E"; }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate max-w-[160px]">{product.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{product.id}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryClass(product.category)}`}>{product.category}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm font-bold text-slate-900">{fmtPrice(product.price)}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                        <span className={`text-sm ${stockText}`}>{product.stock}</span>
                        {stockLabel && <span className={`text-xs px-1.5 py-0.5 rounded-md ${sBadge}`}>{stockLabel}</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-slate-700">{fmt(product.sales)}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm font-semibold text-slate-800">{fmtPrice(revenue)}</span>
                    </TableCell>

                    {/* Status toggle */}
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <StatusToggle status={product.status} onChange={() => toggleStatus(product.id)} />
                        <span className={`text-xs font-medium ${product.status === 'Active' ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {product.status}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 hover:bg-slate-100 rounded-lg" title="Edit" onClick={() => setEditProduct(product)}>
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 hover:bg-slate-100 rounded-lg" title="Duplicate" onClick={() => duplicateProduct(product.id)}>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 hover:bg-red-50 rounded-lg" title="Delete" onClick={() => setDeleteTarget(product.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-8 rounded-xl border border-slate-200/60 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 cursor-pointer">
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>{filtered.length === 0 ? '0' : `${fmt(pageStart + 1)}–${fmt(Math.min(pageStart + pageSize, filtered.length))}`} of {fmt(filtered.length)}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="w-8 h-8 p-0" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="w-8 h-8 p-0" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
