'use client';

import { useState } from 'react';
import { Search, Mail, Crown, Users, UserPlus } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardCustomer } from '../../../data/storeDataGenerator';

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  VIP:     { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  Regular: { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  New:     { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

function fmt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Customers() {
  const { storeData } = useStore();
  const { customers } = storeData;
  const [search, setSearch] = useState('');

  const filtered = customers.filter((c: DashboardCustomer) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const vipCount  = customers.filter((c: DashboardCustomer) => c.status === 'VIP').length;
  const newCount  = customers.filter((c: DashboardCustomer) => c.status === 'New').length;

  const stats = [
    { label: 'Total Customers', value: fmt(customers.length), icon: Users,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'VIP Customers',   value: fmt(vipCount),         icon: Crown,    iconBg: 'bg-purple-50',  iconColor: 'text-purple-600' },
    { label: 'New This Month',  value: fmt(newCount),          icon: UserPlus, iconBg: 'bg-sky-50',     iconColor: 'text-sky-600' },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
          <p className="text-slate-500 text-sm mt-0.5">{customers.length} total customers</p>
        </div>
        <Button className="gradient-bg hover:opacity-90 shadow-sm">
          <Mail className="w-4 h-4 mr-2" />
          Email Campaign
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c: DashboardCustomer) => {
                const cfg = STATUS_CONFIG[c.status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">{c.email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-700">{c.orders}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-slate-900">${fmt(c.spent)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">{c.joined}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {c.status === 'VIP' && <Crown className="w-3 h-3" />}
                        {c.status}
                      </span>
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
