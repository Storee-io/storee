'use client';

import { useState } from 'react';
import { Search, Download, ShoppingBag, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardOrder } from '../../../data/storeDataGenerator';

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Completed:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Processing: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  Shipped:    { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400'     },
};

type Filter = 'All' | 'Processing' | 'Shipped' | 'Completed';

export default function Orders() {
  const { storeData } = useStore();
  const { orders } = storeData;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = orders.filter((o: DashboardOrder) => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    const matchFilter = filter === 'All' || o.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    All:        orders.length,
    Processing: orders.filter((o: DashboardOrder) => o.status === 'Processing').length,
    Shipped:    orders.filter((o: DashboardOrder) => o.status === 'Shipped').length,
    Completed:  orders.filter((o: DashboardOrder) => o.status === 'Completed').length,
  };

  const stats = [
    { label: 'Total Orders',    value: String(counts.All),        icon: ShoppingBag,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Processing',      value: String(counts.Processing),  icon: Clock,        iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Shipped',         value: String(counts.Shipped),     icon: Truck,        iconBg: 'bg-blue-50',    iconColor: 'text-blue-600' },
    { label: 'Completed',       value: String(counts.Completed),   icon: CheckCircle2, iconBg: 'bg-purple-50',  iconColor: 'text-purple-600' },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
          <p className="text-slate-500 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
        <Button className="gradient-bg hover:opacity-90 shadow-sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
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

      {/* Search + filter tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 border-b border-slate-200">
          {(['All', 'Processing', 'Shipped', 'Completed'] as Filter[]).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                filter === s
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === s ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
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
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order: DashboardOrder) => {
                const cfg = STATUS_CONFIG[order.status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
                return (
                  <TableRow key={order.id} className="hover:bg-slate-50/70 transition-colors">
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
                      <span className="text-sm text-slate-500">{order.product}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-slate-900">${order.amount}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">{order.date}</span>
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
