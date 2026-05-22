'use client';

import { useState } from 'react';
import { Plus, Mail, MessageSquare, Bell, TrendingUp, Trash2, X, Megaphone } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type CampaignType   = 'Email' | 'SMS' | 'Push';
type CampaignStatus = 'Active' | 'Scheduled' | 'Draft' | 'Completed';

interface Campaign {
  id: number;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  sent: number;
  opened: number;
  clicked: number;
  date: string;
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: 1, name: 'Summer Sale 2026',        type: 'Email', status: 'Active',    sent: 1240, opened: 412, clicked: 89,  date: 'Jun 1, 2026'  },
  { id: 2, name: 'New Collection Launch',   type: 'Push',  status: 'Scheduled', sent: 0,    opened: 0,   clicked: 0,   date: 'Jun 15, 2026' },
  { id: 3, name: 'Win-Back Inactive Users', type: 'Email', status: 'Draft',     sent: 0,    opened: 0,   clicked: 0,   date: '-'            },
  { id: 4, name: 'Flash Sale Weekend',      type: 'SMS',   status: 'Completed', sent: 856,  opened: 689, clicked: 234, date: 'May 20, 2026' },
];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  Active:    'bg-emerald-100 text-emerald-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Draft:     'bg-slate-100 text-slate-600',
  Completed: 'bg-purple-100 text-purple-700',
};

const TYPE_ICONS: Record<CampaignType, React.ElementType> = {
  Email: Mail,
  SMS:   MessageSquare,
  Push:  Bell,
};

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onSave: (c: Campaign) => void;
}

function CreateCampaignModal({ onClose, onSave }: CreateModalProps) {
  const [name, setName]         = useState('');
  const [type, setType]         = useState<CampaignType>('Email');
  const [scheduled, setScheduled] = useState('');
  const [error, setError]       = useState('');

  function handleSave() {
    if (!name.trim()) { setError('Campaign name is required.'); return; }

    let date   = '-';
    let status: CampaignStatus = 'Draft';

    if (scheduled) {
      date   = new Date(scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      status = 'Scheduled';
    }

    onSave({
      id: Date.now(),
      name: name.trim(),
      type,
      status,
      sent: 0,
      opened: 0,
      clicked: 0,
      date,
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">New Campaign</h3>
              <p className="text-xs text-slate-400">Create a marketing campaign</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Campaign Name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Summer Sale 2026"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Email', 'SMS', 'Push'] as CampaignType[]).map(t => {
                const Icon = TYPE_ICONS[t];
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      type === t
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduled date (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Scheduled Date <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input
              type="date"
              value={scheduled}
              onChange={e => setScheduled(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to save as Draft.</p>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg hover:opacity-90 transition-opacity shadow-sm"
          >
            Create Campaign
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Campaigns() {
  const [campaigns, setCampaigns]   = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  function addCampaign(c: Campaign) {
    setCampaigns(prev => [c, ...prev]);
    setShowCreate(false);
  }

  function deleteCampaign(id: number) {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setDeleteTarget(null);
  }

  const activeCount = campaigns.filter(c => c.status === 'Active').length;
  const totalSent   = campaigns.reduce((s, c) => s + c.sent, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.opened, 0);
  const avgOpenRate = totalSent > 0 ? `${Math.round((totalOpened / totalSent) * 100)}%` : '—';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Campaigns</h2>
          <p className="text-slate-500 text-sm mt-1">Email, SMS, and push notification campaigns</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm"
        >
          <Plus className="w-4 h-4" />New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Campaigns', value: String(activeCount),                            color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Emails Sent',      value: totalSent.toLocaleString('en-US'),              color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Avg Open Rate',    value: avgOpenRate,                                    color: 'text-purple-600',  bg: 'bg-purple-50'  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No campaigns yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Campaign', 'Type', 'Status', 'Sent', 'Open Rate', 'Click Rate', 'Date', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {campaigns.map(c => {
                const Icon      = TYPE_ICONS[c.type] || Mail;
                const openRate  = c.sent > 0 ? `${Math.round((c.opened  / c.sent) * 100)}%` : '-';
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
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">{c.sent.toLocaleString('en-US')}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-700">{openRate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">{clickRate}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-slate-400">{c.date}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setDeleteTarget(c.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateCampaignModal onClose={() => setShowCreate(false)} onSave={addCampaign} />
      )}

      {/* Delete Confirm */}
      {deleteTarget !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setDeleteTarget(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Delete Campaign?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">
              <span className="font-semibold text-slate-800">{campaigns.find(c => c.id === deleteTarget)?.name}</span> will be permanently removed.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => deleteCampaign(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
