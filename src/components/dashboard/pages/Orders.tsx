'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, ShoppingBag, Clock, Truck, CheckCircle2,
  ArrowLeft, Package, MapPin, Mail, ChevronRight, XCircle, RefreshCw,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { makePriceFmt } from '../../../lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardOrder } from '../../../data/storeDataGenerator';
import DateRangePicker, { type DateRange } from '../../ui/DateRangePicker';

// ── DB Order type ─────────────────────────────────────────────────────────────

interface DbOrder {
  id: string;
  store_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal: string | null;
  shipping_method: string | null;
  shipping_cost: number;
  payment_method: string | null;
  subtotal: number;
  total: number;
  items: Array<{ id: string; name: string; image?: string; price: number; qty: number; subtotal: number }>;
  status: string;
  created_at: string;
}

function dbOrderToDashboard(o: DbOrder): DashboardOrder {
  const name = o.customer_name ?? 'Unknown';
  const parts = name.split(' ');
  const avatar = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  const firstItem = Array.isArray(o.items) && o.items.length > 0 ? o.items[0].name : 'Order';
  const extra = Array.isArray(o.items) && o.items.length > 1 ? ` +${o.items.length - 1} more` : '';
  const addressParts = [o.shipping_address, o.shipping_city, o.shipping_province].filter(Boolean);
  const displayDate = new Date(o.created_at).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  return {
    id: o.id,
    customer: name,
    avatar,
    email: o.customer_email ?? '',
    product: firstItem + extra,
    amount: o.total ?? 0,
    status: (['Processing', 'Shipped', 'Completed'].includes(o.status)
      ? o.status : 'Processing') as DashboardOrder['status'],
    date: o.created_at, // ISO string — handled in relativeToDate
    shipping: o.shipping_method ?? 'Standard',
    address: addressParts.join(', '),
    _displayDate: displayDate,
    _paymentMethod: o.payment_method ?? 'Bank Transfer',
    _items: Array.isArray(o.items) ? o.items : [],
  } as DashboardOrder & { _displayDate: string; _paymentMethod: string; _items: DbOrder['items'] };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function relativeToDate(str: string): Date {
  const now = new Date();
  const dayMatch = str.match(/^(\d+)\s*day/);
  if (dayMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - parseInt(dayMatch[1]));
    return d;
  }
  // ISO date string from real DB orders
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return now;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isInRange(date: Date, from: Date, to: Date): boolean {
  const d = stripTime(date);
  return d >= stripTime(from) && d <= stripTime(to);
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; iconBg: string }> = {
  Completed:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', iconBg: 'bg-emerald-500' },
  Processing: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   iconBg: 'bg-amber-400'   },
  Shipped:    { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400',    iconBg: 'bg-blue-400'    },
};

type StatusFilter = 'All' | 'Processing' | 'Shipped' | 'Completed';

// ── Order Detail (full screen) ────────────────────────────────────────────────

interface OrderDetailProps {
  order: DashboardOrder;
  fmtPrice: (n: number) => string;
  onBack: () => void;
  onUpdateStatus: (id: string, status: DashboardOrder['status']) => void;
}

function OrderDetail({ order, fmtPrice, onBack, onUpdateStatus }: OrderDetailProps) {
  const cfg = STATUS_CONFIG[order.status];
  const statusOrder: DashboardOrder['status'][] = ['Processing', 'Shipped', 'Completed'];
  const currentIdx = statusOrder.indexOf(order.status);

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-900">{order.id}</span>
        <span className={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {order.status}
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

          {/* Top row: Order info + Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Order Info */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Order Info</p>
              <div className="space-y-3">
                {[
                  { label: 'Order ID', value: order.id },
                  { label: 'Date',     value: (order as DashboardOrder & { _displayDate?: string })._displayDate ?? order.date },
                  { label: 'Payment',  value: (order as DashboardOrder & { _paymentMethod?: string })._paymentMethod ?? 'Bank Transfer' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{r.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Customer</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                  {order.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{order.customer}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />{order.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>{order.address}</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Order Items</p>
            {(() => {
              const realItems = (order as DashboardOrder & { _items?: DbOrder['items'] })._items;
              const items = realItems && realItems.length > 0
                ? realItems
                : [{ id: '1', name: order.product, price: order.amount, qty: 1, subtotal: order.amount }];
              return items.map((item, idx) => (
                <div key={item.id ?? idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-2 last:mb-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <Package className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Qty: {item.qty}</p>
                  </div>
                  <span className="text-base font-bold text-slate-900 flex-shrink-0">{fmtPrice(item.subtotal)}</span>
                </div>
              ));
            })()}

            {/* Summary */}
            {(() => {
              const ext = order as DashboardOrder & { _items?: DbOrder['items'] };
              const subtotal = Array.isArray(ext._items) && ext._items.length > 0
                ? ext._items.reduce((s, i) => s + i.subtotal, 0)
                : order.amount;
              const shippingCost = order.amount - subtotal;
              return (
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-medium text-slate-900">{fmtPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Shipping ({order.shipping})</span>
                    <span className="font-medium text-slate-900">{shippingCost > 0 ? fmtPrice(shippingCost) : 'Free'}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-slate-900 text-base">{fmtPrice(order.amount)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Shipping + Timeline side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Shipping */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Shipping</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Courier</p>
                    <p className="text-sm font-bold text-slate-900">{order.shipping}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Delivery Address</p>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{order.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Status Timeline</p>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[18px] top-5 bottom-5 w-px bg-slate-100" />
                <div className="space-y-5">
                  {statusOrder.map((s, i) => {
                    const done = currentIdx >= i;
                    const isCurrent = order.status === s;
                    const scfg = STATUS_CONFIG[s];
                    return (
                      <div key={s} className="flex items-center gap-4 relative">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors ${done ? scfg.bg : 'bg-slate-100'}`}>
                          {s === 'Processing' && <Clock className={`w-4 h-4 ${done ? scfg.text : 'text-slate-300'}`} />}
                          {s === 'Shipped' && <Truck className={`w-4 h-4 ${done ? scfg.text : 'text-slate-300'}`} />}
                          {s === 'Completed' && <CheckCircle2 className={`w-4 h-4 ${done ? scfg.text : 'text-slate-300'}`} />}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isCurrent ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-300'}`}>{s}</p>
                          {isCurrent && <p className="text-xs text-slate-400">{order.date}</p>}
                          {!done && <p className="text-xs text-slate-300">Pending</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom spacer so content isn't hidden by sticky CTA */}
          <div className="h-4" />
        </div>
      </div>

      {/* Sticky CTA bar at bottom */}
      {order.status !== 'Completed' && (
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-slate-400">
              {order.status === 'Processing'
                ? 'Ready to fulfill? Ship the order or cancel if needed.'
                : 'Package delivered? Mark as completed to close this order.'}
            </p>
          </div>
          {order.status === 'Processing' && (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 font-semibold flex-shrink-0"
              onClick={() => { onUpdateStatus(order.id, 'Completed'); onBack(); }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Order
            </Button>
          )}
          <Button
            className="gradient-bg hover:opacity-90 text-white font-semibold flex-shrink-0"
            onClick={() => onUpdateStatus(order.id, order.status === 'Processing' ? 'Shipped' : 'Completed')}
          >
            {order.status === 'Processing' ? (
              <><Truck className="w-4 h-4 mr-2" />Mark as Shipped</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" />Mark as Completed</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Orders List ───────────────────────────────────────────────────────────────

export default function Orders() {
  const { activeStore } = useStore();
  const fmtPrice = makePriceFmt(activeStore?.currency?.code ?? 'IDR');

  const [localOrders, setLocalOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrder | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
  const [dateRange, setDateRange] = useState<DateRange>({ from: thirtyDaysAgo, to: today });

  const fetchOrders = useCallback(async () => {
    if (!activeStore?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders?storeId=${activeStore.id}`);
      const data = await res.json();
      if (data.orders) {
        setLocalOrders(data.orders.map(dbOrderToDashboard));
      }
    } catch (err) {
      console.error('[orders] fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleUpdateStatus(id: string, status: DashboardOrder['status']) {
    // Optimistic update
    setLocalOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev);
    // Persist to DB
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch (err) {
      console.error('[orders] status update failed:', err);
    }
  }

  // If an order is selected, render the full-screen detail view
  if (selectedOrder) {
    // Keep selectedOrder in sync with localOrders
    const live = localOrders.find(o => o.id === selectedOrder.id) ?? selectedOrder;
    return (
      <OrderDetail
        order={live}
        fmtPrice={fmtPrice}
        onBack={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  const filtered = localOrders.filter((o: DashboardOrder) => {
    const matchDate   = isInRange(relativeToDate(o.date), dateRange.from, dateRange.to);
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    return matchDate && matchStatus && matchSearch;
  });

  const dateFiltered = localOrders.filter((o: DashboardOrder) =>
    isInRange(relativeToDate(o.date), dateRange.from, dateRange.to)
  );

  const counts: Record<StatusFilter, number> = {
    All:        dateFiltered.length,
    Processing: dateFiltered.filter(o => o.status === 'Processing').length,
    Shipped:    dateFiltered.filter(o => o.status === 'Shipped').length,
    Completed:  dateFiltered.filter(o => o.status === 'Completed').length,
  };

  const stats = [
    { label: 'Total Orders', value: String(counts.All),        icon: ShoppingBag,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Processing',   value: String(counts.Processing), icon: Clock,        iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'   },
    { label: 'Shipped',      value: String(counts.Shipped),    icon: Truck,        iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
    { label: 'Completed',    value: String(counts.Completed),  icon: CheckCircle2, iconBg: 'bg-purple-50',  iconColor: 'text-purple-600'  },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
          <p className="text-slate-500 text-sm mt-0.5">{counts.All} orders in selected period</p>
        </div>
        <div className="flex items-center gap-2.5">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-50 flex-shrink-0"
            onClick={fetchOrders}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 flex-shrink-0">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
              <div className={`w-9 h-9 ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Processing', 'Shipped', 'Completed'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                statusFilter === s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                statusFilter === s ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer or order ID..."
            className="pl-9 h-9 rounded-xl bg-white border-slate-200/60 text-sm placeholder:text-slate-400 focus-visible:ring-emerald-400/40 focus-visible:border-emerald-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Shipping</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 text-slate-300 animate-spin" />
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  {localOrders.length === 0 ? 'No orders yet' : 'No orders found for this period'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order: DashboardOrder) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.Processing;
                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell>
                      <span className="text-sm font-semibold text-slate-900 font-mono">{order.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {order.avatar}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{order.customer}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 max-w-[140px] truncate block">{order.product}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg whitespace-nowrap">{order.shipping}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-slate-900">{fmtPrice(order.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">
                        {(order as DashboardOrder & { _displayDate?: string })._displayDate ?? order.date}
                      </span>
                    </TableCell>
                    <TableCell className="pr-3">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
