'use client';

import { Plus, Mail, MessageSquare, Bell, TrendingUp } from 'lucide-react';

const campaigns = [
  { id: 1, name: 'Summer Sale 2026', type: 'Email', status: 'Active', sent: 1240, opened: 412, clicked: 89, date: 'Jun 1, 2026' },
  { id: 2, name: 'New Collection Launch', type: 'Push', status: 'Scheduled', sent: 0, opened: 0, clicked: 0, date: 'Jun 15, 2026' },
  { id: 3, name: 'Win-Back Inactive Users', type: 'Email', status: 'Draft', sent: 0, opened: 0, clicked: 0, date: '-' },
  { id: 4, name: 'Flash Sale Weekend', type: 'SMS', status: 'Completed', sent: 856, opened: 689, clicked: 234, date: 'May 20, 2026' },
];

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Draft: 'bg-slate-100 text-slate-600',
  Completed: 'bg-purple-100 text-purple-700',
};

const typeIcons: Record<string, React.ElementType> = {
  Email: Mail,
  SMS: MessageSquare,
  Push: Bell,
};

export default function Campaigns() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Campaigns</h2>
          <p className="text-slate-500 text-sm mt-1">Email, SMS, and push notification campaigns</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm">
          <Plus className="w-4 h-4" />New Campaign
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Campaigns', value: '1', color: 'text-emerald-600' },
          { label: 'Emails Sent', value: '2,096', color: 'text-blue-600' },
          { label: 'Avg Open Rate', value: '33.2%', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Campaign', 'Type', 'Status', 'Sent', 'Open Rate', 'Click Rate', 'Date'].map(h => (
                <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {campaigns.map(c => {
              const Icon = typeIcons[c.type] || Mail;
              const openRate = c.sent > 0 ? `${Math.round((c.opened / c.sent) * 100)}%` : '-';
              const clickRate = c.sent > 0 ? `${Math.round((c.clicked / c.sent) * 100)}%` : '-';
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="text-sm text-slate-600">{c.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-4"><span className="text-sm text-slate-700">{c.sent.toLocaleString()}</span></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-700">{openRate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4"><span className="text-sm text-slate-700">{clickRate}</span></td>
                  <td className="px-4 py-4"><span className="text-xs text-slate-400">{c.date}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
