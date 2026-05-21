'use client';

import { useState } from 'react';
import { Search, Mail, Crown, Users, UserPlus, Phone, Clock } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { makePriceFmt } from '../../../lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardCustomer } from '../../../data/storeDataGenerator';

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  VIP:     { bg: 'bg-purple-100', text: 'text-purple-700' },
  Regular: { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  New:     { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export default function Customers() {
  const { storeData, activeStore } = useStore();
  const fmtPrice = makePriceFmt(activeStore?.currency?.code ?? 'USD');
  const { customers } = storeData;
  const [search, setSearch] = useState('');

  const filtered = customers.filter((c: DashboardCustomer) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const vipCount = customers.filter((c: DashboardCustomer) => c.status === 'VIP').length;
  const newCount = customers.filter((c: DashboardCustomer) => c.status === 'New').length;

  const stats = [
    { label: 'Total Customers', value: String(customers.length), icon: Users,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'VIP Customers',   value: String(vipCount),         icon: Crown,    iconBg: 'bg-purple-50',  iconColor: 'text-purple-600' },
    { label: 'New This Month',  value: String(newCount),          icon: UserPlus, iconBg: 'bg-sky-50',     iconColor: 'text-sky-600' },
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Avg. Spend</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Last Active
                </span>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c: DashboardCustomer) => {
                const cfg = STATUS_CONFIG[c.status] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer — name + phone stacked */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            {c.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm font-medium text-slate-700">{c.orders}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm font-bold text-slate-900">{fmtPrice(c.spent)}</span>
                    </TableCell>

                    {/* Avg spend */}
                    <TableCell>
                      <span className="text-sm text-slate-600">{fmtPrice(c.avgSpend)}</span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-slate-400">{c.joined}</span>
                    </TableCell>

                    {/* Last active */}
                    <TableCell>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          c.lastActive === 'Just now' || c.lastActive?.includes('min')
                            ? 'bg-emerald-400'
                            : c.lastActive?.includes('hr') || c.lastActive === 'Yesterday'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                        }`} />
                        {c.lastActive}
                      </span>
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
