'use client';

import { useState, useMemo } from 'react';
import {
  Search, Plus, Edit3, Trash2, Copy, ChevronUp, ChevronDown,
  ChevronsUpDown, Package, TrendingUp, DollarSign, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardProduct } from '../../../data/storeDataGenerator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function stockLevel(stock: number): 'critical' | 'low' | 'ok' {
  if (stock <= 5) return 'critical';
  if (stock <= 20) return 'low';
  return 'ok';
}

const STOCK_CONFIG = {
  critical: { dot: 'bg-red-500', label: 'Critical', text: 'text-red-600 font-semibold' },
  low: { dot: 'bg-amber-400', label: 'Low', text: 'text-amber-600 font-semibold' },
  ok: { dot: 'bg-emerald-500', label: '', text: 'text-slate-700' },
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

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  iconBg: string;
  iconColor: string;
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function Products() {
  const { storeData, activeStore } = useStore();
  const { products } = storeData;

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

  // ── Derived ─────────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).sort();
    return ['All', ...cats];
  }, [products]);

  const activeCount = products.filter(p => p.status === 'Active').length;
  const draftCount = products.filter(p => p.status === 'Draft').length;
  const stockValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);
  const totalRevenue = products.reduce((acc, p) => acc + p.price * p.sales, 0);

  // Locale-independent formatter — identical output on server and client
  const fmt = (n: number): string => {
    const s = String(Math.round(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const currencySymbol = activeStore?.currency?.symbol ?? '$';
  const fmtUSD = (n: number) => `${currencySymbol}${fmt(n)}`;

  const filtered = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'All') list = list.filter(p => p.category === categoryFilter);
    if (statusFilter !== 'All') list = list.filter(p => p.status === statusFilter);

    list.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortKey === 'revenue') { va = a.price * a.sales; vb = b.price * b.sales; }
      else if (sortKey === 'name') { va = a.name; vb = b.name; }
      else if (sortKey === 'status') { va = a.status; vb = b.status; }
      else { va = a[sortKey]; vb = b[sortKey]; }

      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? (va - (vb as number)) : ((vb as number) - va);
    });

    return list;
  }, [products, search, categoryFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  // Reset page when filter changes
  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
    setSelected(new Set());
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function toggleSelectAll() {
    if (pageItems.every(p => selected.has(p.id))) {
      const next = new Set(selected);
      pageItems.forEach(p => next.delete(p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pageItems.forEach(p => next.add(p.id));
      setSelected(next);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const allPageSelected = pageItems.length > 0 && pageItems.every(p => selected.has(p.id));
  const somePageSelected = pageItems.some(p => selected.has(p.id));

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="text-slate-500 text-sm mt-0.5">{products.length} products in your store</p>
        </div>
        <Button className="gradient-bg hover:opacity-90 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Products"
          value={String(products.length)}
          sub={`${fmt(activeCount)} active · ${fmt(draftCount)} draft`}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Products"
          value={String(activeCount)}
          sub={`${Math.round((activeCount / products.length) * 100)}% of catalog`}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Value"
          value={fmtUSD(stockValue)}
          sub={`${products.filter(p => p.stock <= 5).length} critical stock`}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={fmtUSD(totalRevenue)}
          sub="from all product sales"
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Status Tabs + Toolbar */}
      <div className="space-y-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Active', 'Draft'] as StatusFilter[]).map(s => {
            const count = s === 'All' ? products.length : s === 'Active' ? activeCount : draftCount;
            return (
              <button
                key={s}
                onClick={() => handleFilterChange(() => setStatusFilter(s))}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  statusFilter === s ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => handleFilterChange(() => setSearch(e.target.value))}
              placeholder="Search by name, category, or ID..."
              className="pl-9 h-9 rounded-xl bg-white border-slate-200/60 text-sm placeholder:text-slate-400 focus-visible:ring-emerald-400/40 focus-visible:border-emerald-400"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => handleFilterChange(() => setCategoryFilter(e.target.value))}
            className="h-9 rounded-xl bg-white border border-slate-200/60 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 cursor-pointer"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-sm font-medium text-emerald-800">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100">
              Set Active
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100">
              Set Draft
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => setSelected(new Set())}>
              Delete Selected
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => setSelected(new Set())}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={el => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 cursor-pointer accent-emerald-500"
                />
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Product <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('price')}
                  className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Price <SortIcon col="price" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('stock')}
                  className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Stock <SortIcon col="stock" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('sales')}
                  className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sales <SortIcon col="sales" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('revenue')}
                  className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Revenue <SortIcon col="revenue" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('status')}
                  className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TableHead>
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
                const { dot, label: stockLabel, text: stockText } = STOCK_CONFIG[level];
                const revenue = product.price * product.sales;
                const isSelected = selected.has(product.id);

                return (
                  <TableRow
                    key={product.id}
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}
                  >
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer accent-emerald-500"
                      />
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-11 h-11 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                          onError={e => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23f1f5f9'/%3E%3C/svg%3E";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate max-w-[160px]">{product.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{product.id}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryClass(product.category)}`}>
                        {product.category}
                      </span>
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <span className="text-sm font-bold text-slate-900">{fmtUSD(product.price)}</span>
                    </TableCell>

                    {/* Stock */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                        <span className={`text-sm ${stockText}`}>{product.stock}</span>
                        {stockLabel && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                            level === 'critical'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}>
                            {stockLabel}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Sales */}
                    <TableCell>
                      <span className="text-sm text-slate-700">{fmt(product.sales)}</span>
                    </TableCell>

                    {/* Revenue */}
                    <TableCell>
                      <span className="text-sm font-semibold text-slate-800">{fmtUSD(revenue)}</span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${product.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className={`text-sm font-medium ${product.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {product.status}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 hover:bg-slate-100 rounded-lg" title="Edit">
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 hover:bg-slate-100 rounded-lg" title="Duplicate">
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 hover:bg-red-50 rounded-lg" title="Delete">
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
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-8 rounded-xl border border-slate-200/60 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span>
            {filtered.length === 0 ? '0' : `${fmt(pageStart + 1)}–${fmt(Math.min(pageStart + pageSize, filtered.length))}`} of {fmt(filtered.length)}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 p-0"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 p-0"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
