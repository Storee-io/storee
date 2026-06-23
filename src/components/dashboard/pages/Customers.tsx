'use client';

import { useState, useEffect } from 'react';
import { Search, Mail, Crown, Users, UserPlus, Clock } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { makePriceFmt } from '../../../lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardCustomer } from '../../../data/storeDataGenerator';
import { StatCardSkeleton, TableSkeleton } from '../ui/Skeleton';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/** Converts local Indonesian number → +62 format for display, and digits-only for wa.me */
function formatWaNumber(phone: string): { display: string; waLink: string } {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? '62' + digits.slice(1) : digits;
  const display = '+' + intl.replace(/(\d{2})(\d{3,4})(\d{4})(\d+)/, '$1 $2-$3-$4');
  return { display, waLink: `https://wa.me/${intl}` };
}

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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

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
        {!isMounted ? (
          stats.map(s => (
            <StatCardSkeleton key={s.label} label={s.label} icon={s.icon} iconBg={s.iconBg} iconColor={s.iconColor} />
          ))
        ) : (
          stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 min-h-[150px] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                <div className={`w-9 h-9 ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              </div>
            </div>
          ))
        )}
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
              <TableHead>Phone</TableHead>
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
          {!isMounted ? <TableSkeleton rows={6} cols={6} /> : <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c: DashboardCustomer) => {
                const cfg = STATUS_CONFIG[c.status] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer — name only */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                      </div>
                    </TableCell>

                    {/* Phone — WhatsApp link */}
                    <TableCell>
                      {(() => {
                        const { display, waLink } = formatWaNumber(c.phone);
                        return (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#25D366] transition-colors group"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 group-hover:text-[#25D366] transition-colors" />
                            {display}
                          </a>
                        );
                      })()}
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
          </TableBody>}
        </Table>
      </div>
    </div>
  );
}
