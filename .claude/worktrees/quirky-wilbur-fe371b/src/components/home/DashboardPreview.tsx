'use client';

import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { revenueData, recentOrders } from '../../data/dummyData';
import { TrendingUp, Package, ShoppingBag, Users } from 'lucide-react';

const stats = [
  { label: 'Total Revenue', value: '$9,400', change: '+18%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Total Orders', value: '91', change: '+12%', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Products', value: '48', change: '+4', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Customers', value: '312', change: '+24%', icon: Users, color: 'text-rose-600', bg: 'bg-rose-50' },
];

const statusColors: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Processing: 'bg-amber-100 text-amber-700',
  Shipped: 'bg-blue-100 text-blue-700',
};

export default function DashboardPreview() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600 font-medium mb-4"
          >
            Powerful Dashboard
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4"
          >
            Manage Everything <span className="gradient-text">Effortlessly</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 max-w-xl mx-auto"
          >
            A Shopify-grade dashboard that makes running your store a joy, not a chore
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-2xl"
        >
          {/* Mock browser bar */}
          <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-4 bg-slate-700 rounded-md px-3 py-1">
              <span className="text-xs text-slate-400 font-mono">dashboard.storee.app</span>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar preview */}
            <div className="hidden sm:block w-16 lg:w-48 bg-white border-r border-slate-200 py-4">
              <div className="px-3 mb-6">
                <div className="h-8 w-24 gradient-bg rounded-lg opacity-70" />
              </div>
              {['Overview', 'Orders', 'Products', 'Customers', 'Analytics', 'Settings'].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg mb-1 ${i === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}
                >
                  <div className={`w-5 h-5 rounded ${i === 0 ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                  <span className="hidden lg:block text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-4 lg:p-6 overflow-hidden">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {stats.map(stat => (
                  <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                      <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">{stat.change} this month</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Revenue Overview</h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Last 7 months</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent orders */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-900 text-sm mb-3">Recent Orders</h3>
                <div className="space-y-2">
                  {recentOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {order.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{order.customer}</p>
                        <p className="text-xs text-slate-500 truncate">{order.product}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-900">${order.amount}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] || 'bg-slate-100 text-slate-600'}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
