'use client';

import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Collections() {
  const { storeData, setStoreData } = useStore();
  const [collections, setCollections] = useState(storeData?.design?.collections || []);
  const [saved, setSaved] = useState(false);

  const handleAddCollection = () => {
    setCollections([...collections, { emoji: '✨', name: '' }]);
  };

  const handleDeleteCollection = (idx: number) => {
    setCollections(collections.filter((_, i) => i !== idx));
  };

  const handleUpdateCollection = (idx: number, field: 'emoji' | 'name', value: string) => {
    setCollections(collections.map((c, i) =>
      i === idx ? { ...c, [field]: field === 'emoji' ? value.slice(0, 2) : value } : c
    ));
  };

  const handleSave = () => {
    setStoreData(prev => ({
      ...prev,
      design: {
        ...(prev?.design || {}),
        collections,
      }
    }));
    setSaved(true);
    toast.success('Collections saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const statsWithNames = collections.filter(c => c.name).length;
  const statsEmpty = collections.filter(c => !c.name).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Collections</h1>
        <p className="text-sm text-slate-500 mt-1">Organize products into collections with custom names & emojis</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-2">Total Collections</p>
          <p className="text-2xl font-bold text-slate-900">{collections.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-2">With Names</p>
          <p className="text-2xl font-bold text-slate-900">{statsWithNames}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-2">Empty Names</p>
          <p className="text-2xl font-bold text-slate-900">{statsEmpty}</p>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-base">Collection Items</h2>
        </div>

        {collections.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">No collections yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {collections.map((c, i) => (
              <div key={i} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <input
                  type="text"
                  value={c.emoji}
                  onChange={e => handleUpdateCollection(i, 'emoji', e.target.value)}
                  maxLength={2}
                  className="w-12 h-12 bg-slate-100 rounded-lg text-center text-xl font-bold outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
                />
                <input
                  type="text"
                  value={c.name}
                  onChange={e => handleUpdateCollection(i, 'name', e.target.value)}
                  placeholder="Collection name (e.g., New Arrivals)"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={() => handleDeleteCollection(i)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                  title="Delete collection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleAddCollection}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Collection
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        {saved && (
          <p className="text-sm text-emerald-600 font-medium">✓ Changes saved</p>
        )}
        <div className="ml-auto">
          <Button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5"
          >
            <Save className="w-4 h-4" />
            Save Collections
          </Button>
        </div>
      </div>
    </div>
  );
}
