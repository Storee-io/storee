'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Legend,
} from 'recharts';
import { topProducts, recentOrders } from '../../../data/dummyData';
import {
  TrendingUp, TrendingDown, Users, ShoppingBag, Eye, DollarSign,
  Package, Star, ArrowUpRight,
} from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import DateRangePicker, { type DateRange } from '../../ui/DateRangePicker';

// ── Data ─────────────────────────────────────────────────────────────────────

const BASE_TRAFFIC = [
  { day: 'Mon', visitors: 142, pageviews: 412 },
  { day: 'Tue', visitors: 189, pageviews: 534 },
  { day: 'Wed', visitors: 156, pageviews: 441 },
  { day: 'Thu', visitors: 210, pageviews: 628 },
  { day: 'Fri', visitors: 248, pageviews: 712 },
  { day: 'Sat', visitors: 312, pageviews: 891 },
  { day: 'Sun', visitors: 289, pageviews: 823 },
];

// Generate daily traffic data points for a date range
function buildTrafficData(from: Date, to: Date) {
  const days: { day: string; visitors: number; pageviews: number }[] = [];
  const diff = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  const clamp = Math.min(diff, 30); // show max 30 points for readability
  const step  = Math.max(1, Math.floor(diff / clamp));
  for (let i = 0; i < diff; i += step) {
    const d = new Date(from); d.setDate(d.getDate() + i);
    const base = BASE_TRAFFIC[d.getDay()];
    const seed = (d.getDate() * 7 + d.getMonth() * 3) % 40;
    days.push({
      day: diff <= 14
        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      visitors:  Math.round(base.visitors  * (0.7 + seed / 100)),
      pageviews: Math.round(base.pageviews * (0.7 + seed / 100)),
    });
  }
  return days;
}

// Generate monthly revenue data for a date range
function buildRevenueData(from: Date, to: Date) {
  const months: { month: string; revenue: number; orders: number; avgOrder: number }[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(),   to.getMonth(),   1);
  const BASE = [4200,5800,4900,7200,6100,8900,9400,7800,6500,8100,9200,10400];
  while (cur <= end) {
    const seed = (cur.getMonth() + cur.getFullYear() * 12) % 20;
    const rev  = Math.round(BASE[cur.getMonth()] * (0.85 + seed / 100));
    const ord  = Math.round(rev / 148);
    months.push({
      month:    cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      revenue:  rev,
      orders:   ord,
      avgOrder: Math.round(rev / ord),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.length ? months : [{ month: 'Now', revenue: 3200, orders: 22, avgOrder: 145 }];
}

// Scale KPI values based on days in range
function scaleKpi(base: number, days: number, refDays = 30) {
  const factor = days / refDays;
  const jitter = 0.85 + (days % 7) / 40;
  return Math.round(base * factor * jitter);
}

const sourceData = [
  { name: 'Organic Search', value: 38, color: '#10b981' },
  { name: 'Direct',         value: 25, color: '#0ea5e9' },
  { name: 'Social Media',   value: 22, color: '#8b5cf6' },
  { name: 'Referral',       value: 15, color: '#f59e0b' },
];

const orderStatusData = [
  { name: 'Completed',  value: 68, color: '#10b981' },
  { name: 'Processing', value: 18, color: '#0ea5e9' },
  { name: 'Shipped',    value: 10, color: '#8b5cf6' },
  { name: 'Cancelled',  value: 4,  color: '#f43f5e' },
];

const hourlyData = [
  { hour: '00', orders: 2 }, { hour: '02', orders: 1 }, { hour: '04', orders: 0 },
  { hour: '06', orders: 3 }, { hour: '08', orders: 8 }, { hour: '10', orders: 15 },
  { hour: '12', orders: 22 }, { hour: '14', orders: 18 }, { hour: '16', orders: 25 },
  { hour: '18', orders: 30 }, { hour: '20', orders: 19 }, { hour: '22', orders: 9 },
];



// ── Component ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { activeStore } = useStore();
  const sym = activeStore?.currency?.symbol ?? '$';

  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
    to: today,
  });

  const days = Math.max(1, Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000) + 1);

  const trafficData   = buildTrafficData(dateRange.from, dateRange.to);
  const revenueChartData = buildRevenueData(dateRange.from, dateRange.to);

  const rev      = scaleKpi(18260, days);
  const orders   = scaleKpi(1248,  days);
  const visitors = scaleKpi(1546,  days);
  const pageviews = scaleKpi(4429, days);
  const avgOrder = orders > 0 ? Math.round(rev / orders) : 0;

  const kpis = [
    { label: 'Total Revenue',    value: `${sym}${rev.toLocaleString()}`,      change: '+18.6%', up: true,  icon: DollarSign,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Orders',     value: orders.toLocaleString(),              change: '+12.4%', up: true,  icon: ShoppingBag, color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Unique Visitors',  value: visitors.toLocaleString(),            change: '+8.2%',  up: true,  icon: Users,       color: 'text-purple-600',  bg: 'bg-purple-50' },
    { label: 'Page Views',       value: pageviews.toLocaleString(),           change: '+12.0%', up: true,  icon: Eye,         color: 'text-cyan-600',    bg: 'bg-cyan-50' },
    { label: 'Conversion Rate',  value: `${(orders / Math.max(visitors,1) * 100).toFixed(1)}%`, change: '+0.4%', up: true, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg. Order Value', value: `${sym}${avgOrder}`,                  change: '+5.8%',  up: true,  icon: Star,        color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Cart Abandonment', value: '62%',                                change: '-5.0%',  up: false, icon: Package,     color: 'text-rose-600',    bg: 'bg-rose-50' },
    { label: 'Repeat Customers', value: '34%',                                change: '+2.1%',  up: true,  icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header + Date range picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Track your store performance</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI grid — 4 cols on lg, 2 on sm */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${k.up ? 'text-emerald-600' : 'text-rose-500'}`}>
              {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {k.change} vs prev period
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend + Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Revenue & Orders Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOrd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: unknown, name: string) => [name === 'revenue' ? `${sym}${Number(v).toLocaleString()}` : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRev)" name="revenue" />
              <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gradOrd)" name="orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-5">Traffic Sources</h3>
          <div className="flex justify-center mb-4">
            <PieChart width={160} height={160}>
              <Pie data={sourceData} cx={80} cy={80} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {sourceData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2.5">
            {sourceData.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-slate-600">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                  </div>
                  <span className="text-xs font-bold text-slate-900 w-7 text-right">{s.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Traffic + Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-5">Weekly Traffic</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2.5} dot={false} name="Visitors" />
              <Line type="monotone" dataKey="pageviews" stroke="#0ea5e9" strokeWidth={2.5} dot={false} name="Page Views" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-5">Order Status</h3>
          <div className="flex justify-center mb-4">
            <PieChart width={160} height={160}>
              <Pie data={orderStatusData} cx={80} cy={80} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {orderStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2.5">
            {orderStatusData.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-slate-600">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                  </div>
                  <span className="text-xs font-bold text-slate-900 w-7 text-right">{s.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders by Hour */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-1">Orders by Hour</h3>
        <p className="text-xs text-slate-400 mb-5">Peak order times throughout the day</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourlyData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={h => `${h}:00`} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: unknown) => [v, 'Orders']} labelFormatter={l => `${l}:00`} />
            <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Top Products</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {topProducts.map((p, i) => {
              const maxRevenue = topProducts[0].revenue;
              return (
                <div key={p.name} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="text-sm font-bold text-slate-300 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{p.sales} sold</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{sym}{p.revenue.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Recent Orders</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center gap-3 px-6 py-3.5">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {o.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{o.customer}</p>
                  <p className="text-xs text-slate-400 truncate">{o.product}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{sym}{o.amount}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    o.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                    o.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                    'bg-purple-50 text-purple-600'
                  }`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
