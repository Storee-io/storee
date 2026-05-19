'use client';

import { useState } from 'react';
import { Palette, Type, Layout, Check } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const colorPresets = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Ocean', value: '#0ea5e9' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Indigo', value: '#6366f1' },
];

const fonts = ['Inter', 'Poppins', 'DM Sans', 'Plus Jakarta Sans', 'Nunito'];

const layouts = [
  { id: 'minimal', name: 'Minimal', desc: 'Clean and spacious' },
  { id: 'classic', name: 'Classic', desc: 'Traditional ecommerce' },
  { id: 'bold', name: 'Bold', desc: 'High impact visuals' },
];

export default function Appearance() {
  const { activeStore } = useStore();
  const [primaryColor, setPrimaryColor] = useState(activeStore?.primaryColor || '#10b981');
  const [font, setFont] = useState('Inter');
  const [layout, setLayout] = useState('minimal');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Appearance</h2>
          <p className="text-slate-500 text-sm mt-1">Customize your store's look and feel</p>
        </div>
        <Button onClick={save} className="gradient-bg hover:opacity-90">
          {saved ? <><Check className="w-4 h-4 mr-2" />Saved!</> : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Primary Color */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
              <Palette className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="font-bold text-slate-900">Brand Color</h3>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {colorPresets.map(c => (
              <button
                key={c.value}
                onClick={() => setPrimaryColor(c.value)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-10 h-10 rounded-xl shadow-sm transition-all ${primaryColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c.value }}
                />
                <span className="text-xs text-slate-500">{c.name}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
            />
            <span className="text-sm text-slate-600 font-mono">{primaryColor}</span>
          </div>
        </Card>

        {/* Typography */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
              <Type className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="font-bold text-slate-900">Typography</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fonts.map(f => (
              <button
                key={f}
                onClick={() => setFont(f)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${font === f ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <p className="text-lg font-bold text-slate-900" style={{ fontFamily: f }}>Aa</p>
                <p className="text-xs text-slate-500 mt-1">{f}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Layout */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
              <Layout className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="font-bold text-slate-900">Layout Style</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {layouts.map(l => (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${layout === l.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="space-y-1.5 mb-3">
                  <div className={`h-2 rounded-full bg-slate-300 ${l.id === 'bold' ? 'w-full' : 'w-3/4'}`} />
                  <div className="h-1.5 rounded-full bg-slate-200 w-1/2" />
                </div>
                <p className="text-sm font-bold text-slate-900">{l.name}</p>
                <p className="text-xs text-slate-400">{l.desc}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
