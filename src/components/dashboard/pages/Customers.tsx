'use client';

import { useState } from 'react';
import { Search, Mail, Crown } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusColors: Record<string, { bg: string; text: string }> = {
  VIP: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Regular: { bg: 'bg-blue-100', text: 'text-blue-700' },
  New: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export default function Customers() {
  const { storeData } = useStore();
  const { customers } = storeData;
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const vipCount = customers.filter(c => c.status === 'VIP').length;
  const newCount = customers.filter(c => c.status === 'New').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
          <p className="text-slate-500 text-sm mt-1">{customers.length} total customers</p>
        </div>
        <Button className="gradient-bg hover:opacity-90">
          <Mail className="w-4 h-4 mr-2" />Email Campaign
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Customers', value: String(customers.length), icon: '👥' },
          { label: 'VIP Customers', value: String(vipCount), icon: '👑' },
          { label: 'New This Month', value: String(newCount), icon: '✨' },
        ].map(s => (
          <Card key={s.label} className="p-5 text-center">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="pl-9"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                    <span className="text-sm font-bold text-slate-900">${c.spent.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-400">{c.joined}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[c.status]?.bg || 'bg-slate-100'} ${statusColors[c.status]?.text || 'text-slate-600'} flex items-center gap-1 w-fit`}>
                      {c.status === 'VIP' && <Crown className="w-3 h-3" />}
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
