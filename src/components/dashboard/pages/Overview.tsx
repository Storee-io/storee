'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { TrendingUp, ShoppingBag, Package, Users, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';

// Locale-independent formatter — server and client always agree
function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const statusColors: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Processing: 'bg-amber-100 text-amber-700',
  Shipped: 'bg-blue-100 text-blue-700',
};

export default function Overview() {
  const { activeStore, storeData } = useStore();
  const { revenueChart, orders, topProducts, products, customers } = storeData;

  const totalRevenue = activeStore?.revenue || revenueChart.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = activeStore?.orders || orders.length;
  const currencySymbol = activeStore?.currency?.symbol ?? '$';

  const stats = [
    { label: 'Total Revenue', value: `${currencySymbol}${fmt(totalRevenue)}`, change: '+18%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Orders', value: String(totalOrders), change: '+12%', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Products', value: String(products.length), change: `+${Math.max(1, Math.floor(products.length / 4))} new`, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Customers', value: String(customers.length), change: '+24%', icon: Users, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your store today</p>
        </div>
        <select className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-600 bg-white outline-none">
          <option>Last 7 months</option>
          <option>Last 30 days</option>
          <option>Last year</option>
        </select>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {stat.change} this month
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Revenue Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">Monthly revenue trend</p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">Last 7 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChart}>
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
                formatter={(v: unknown) => [`${currencySymbol}${fmt(Number(v))}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#colorRevDash)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900">Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly orders</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px' }}
              />
              <Bar dataKey="orders" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Recent Orders</h3>
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
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
                    <p className="text-xs font-bold text-slate-700 ml-2">{currencySymbol}{order.amount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Top Products</h3>
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-slate-400 flex-shrink-0">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-sm font-bold text-slate-700 ml-2">{currencySymbol}{fmt(p.revenue)}</p>
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
