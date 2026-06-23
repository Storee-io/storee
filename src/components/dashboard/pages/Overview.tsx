'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { TrendingUp, ShoppingBag, Package, Users, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import DateRangePicker, { type DateRange } from '../../ui/DateRangePicker';
import { makePriceFmt } from '../../../lib/formatCurrency';
import { StatCardSkeleton, ChartSkeleton, Skeleton } from '../ui/Skeleton';

function buildRevenueData(from: Date, to: Date) {
  const months: { month: string; revenue: number; orders: number }[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  const BASE = [4200, 5800, 4900, 7200, 6100, 8900, 9400, 7800, 6500, 8100, 9200, 10400];
  while (cur <= end) {
    const seed = (cur.getMonth() + cur.getFullYear() * 12) % 20;
    const rev  = Math.round(BASE[cur.getMonth()] * (0.85 + seed / 100));
    const ord  = Math.round(rev / 148);
    months.push({
      month:   cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      revenue: rev,
      orders:  ord,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.length ? months : [{ month: 'Now', revenue: 3200, orders: 22 }];
}

function scaleKpi(base: number, days: number, refDays = 30) {
  const factor = days / refDays;
  const jitter = 0.85 + (days % 7) / 40;
  return Math.round(base * factor * jitter);
}

const statusColors: Record<string, string> = {
  Completed:  'bg-emerald-100 text-emerald-700',
  Processing: 'bg-amber-100 text-amber-700',
  Shipped:    'bg-blue-100 text-blue-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Overview() {
  const { activeStore, storeData, isLoadingActiveStore } = useStore();
  const { orders, topProducts, products, customers } = storeData;
  const fmtPrice = makePriceFmt(activeStore?.currency?.code ?? 'USD');

  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
    to: today,
  });

  const days = Math.max(1, Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000) + 1);
  const revenueChartData = buildRevenueData(dateRange.from, dateRange.to);

  const baseRevenue = activeStore?.revenue || 12840;
  const baseOrderCount = activeStore?.orders || orders.length;

  const totalRevenue = scaleKpi(baseRevenue, days, 30);
  const totalOrders  = scaleKpi(baseOrderCount, days, 30);

  const stats = [
    { label: 'Total Revenue', value: fmtPrice(totalRevenue), change: '+18%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Orders',  value: String(totalOrders),                     change: '+12%', icon: ShoppingBag, color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Products',      value: String(products.length),                 change: `+${Math.max(1, Math.floor(products.length / 4))} new`, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Customers',     value: String(customers.length),                change: '+24%', icon: Users,      color: 'text-rose-600',   bg: 'bg-rose-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your store</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingActiveStore ? (
          stats.map(stat => (
            <StatCardSkeleton key={stat.label} label={stat.label} icon={stat.icon} iconBg={stat.bg} iconColor={stat.color} />
          ))
        ) : (
          stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100 min-h-[150px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change} vs prev period
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue area chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900">Revenue Overview</h3>
            <p className="text-xs text-slate-500 mt-0.5">Revenue trend for selected period</p>
          </div>
          {isLoadingActiveStore ? <ChartSkeleton height="h-[200px]" /> : <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorRevDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px' }}
                formatter={(v: unknown) => [fmtPrice(Number(v)), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#colorRevDash)" />
            </AreaChart>
          </ResponsiveContainer>}
        </div>

        {/* Orders bar chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900">Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Order volume trend</p>
          </div>
          {isLoadingActiveStore ? <ChartSkeleton height="h-[200px]" /> : <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px' }}
              />
              <Bar dataKey="orders" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Recent Orders</h3>
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {isLoadingActiveStore ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                  <div className="flex justify-between"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-12" /></div>
                </div>
              </div>
            )) : orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {order.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 truncate">{order.customer}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${statusColors[order.status] || 'bg-slate-100 text-slate-600'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate">{order.product}</p>
                    <p className="text-xs font-bold text-slate-700 ml-2">{fmtPrice(Number(order.amount))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Top Products</h3>
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {isLoadingActiveStore ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-6 h-3" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3.5 w-16" /></div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>
            )) : topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-slate-400 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-sm font-bold text-slate-700 ml-2">{fmtPrice(p.revenue)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-bg rounded-full"
                        style={{ width: `${(p.sales / (topProducts[0]?.sales || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{p.sales} sold</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
