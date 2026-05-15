'use client';

import { useState } from 'react';
import { Search, Package } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusColors: Record<string, { bg: string; text: string }> = {
  Completed: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Processing: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Shipped: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function Orders() {
  const { storeData } = useStore();
  const { orders } = storeData;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = orders.filter(o => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    const matchFilter = filter === 'All' || o.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
          <p className="text-slate-500 text-sm mt-1">{orders.length} total orders</p>
        </div>
        <Button className="gradient-bg hover:opacity-90">
          <Package className="w-4 h-4 mr-2" />Export
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', 'Processing', 'Shipped', 'Completed'].map(s => (
            <Button
              key={s}
              onClick={() => setFilter(s)}
              variant={filter === s ? 'default' : 'outline'}
              className={filter === s ? 'gradient-bg' : ''}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(order => (
                <TableRow key={order.id} className="hover:bg-slate-50">
                  <TableCell>
                    <span className="text-sm font-semibold text-slate-900">{order.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {order.avatar}
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{order.customer}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{order.product}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-bold text-slate-900">${order.amount}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[order.status]?.bg || 'bg-slate-100'} ${statusColors[order.status]?.text || 'text-slate-600'}`}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-400">{order.date}</span>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
