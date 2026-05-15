'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { revenueData } from '../../../data/dummyData';
import { TrendingUp, TrendingDown, Users, ShoppingBag, Eye } from 'lucide-react';

const trafficData = [
  { day: 'Mon', visitors: 142, pageviews: 412 },
  { day: 'Tue', visitors: 189, pageviews: 534 },
  { day: 'Wed', visitors: 156, pageviews: 441 },
  { day: 'Thu', visitors: 210, pageviews: 628 },
  { day: 'Fri', visitors: 248, pageviews: 712 },
  { day: 'Sat', visitors: 312, pageviews: 891 },
  { day: 'Sun', visitors: 289, pageviews: 823 },
];

const sourceData = [
  { name: 'Organic Search', value: 38, color: '#10b981' },
  { name: 'Direct', value: 25, color: '#0ea5e9' },
  { name: 'Social Media', value: 22, color: '#8b5cf6' },
  { name: 'Referral', value: 15, color: '#f59e0b' },
];

export default function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-500 text-sm mt-1">Track your store performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Page Views', value: '4,429', change: '+12%', up: true, icon: Eye },
          { label: 'Visitors', value: '1,546', change: '+8%', up: true, icon: Users },
          { label: 'Conversion Rate', value: '3.2%', change: '+0.4%', up: true, icon: TrendingUp },
          { label: 'Cart Abandonment', value: '62%', change: '-5%', up: false, icon: ShoppingBag },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
              <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center">
                <kpi.icon className="w-4 h-4 text-slate-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${kpi.up ? 'text-emerald-600' : 'text-rose-600'}`}>
              {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {kpi.change} vs last week
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-5">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#colorRevA)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic sources */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-5">Traffic Sources</h3>
          <div className="flex justify-center mb-4">
            <PieChart width={160} height={160}>
              <Pie data={sourceData} cx={80} cy={80} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2">
            {sourceData.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs text-slate-600">{s.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-5">Weekly Traffic</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            <Line type="monotone" dataKey="visitors" stroke="#10b981" strokeWidth={2.5} dot={false} name="Visitors" />
            <Line type="monotone" dataKey="pageviews" stroke="#0ea5e9" strokeWidth={2.5} dot={false} name="Page Views" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
