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
    <div className="min-h-screen bg-slate-50">
      {/* Page Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Collections</h1>
          <p className="text-sm text-slate-500">Organize products into collections with custom names & emojis</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Total Collections</p>
            <p className="text-2xl font-bold text-slate-900">{collections.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">With Names</p>
            <p className="text-2xl font-bold text-emerald-600">{statsWithNames}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Empty Names</p>
            <p className="text-2xl font-bold text-amber-600">{statsEmpty}</p>
          </div>
        </div>

        {/* Collections Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Collection Items</h2>
          </div>

          {/* Content */}
          {collections.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-400">No collections yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {collections.map((c, i) => (
                <div
                  key={i}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group"
                >
                  {/* Emoji Input */}
                  <div className="flex-shrink-0">
                    <input
                      type="text"
                      value={c.emoji}
                      onChange={e => handleUpdateCollection(i, 'emoji', e.target.value)}
                      maxLength={2}
                      className="w-12 h-12 bg-slate-100 rounded-xl text-center text-lg font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 transition-all"
                      title="Collection emoji"
                    />
                  </div>

                  {/* Name Input */}
                  <input
                    type="text"
                    value={c.name}
                    onChange={e => handleUpdateCollection(i, 'name', e.target.value)}
                    placeholder="Collection name (e.g., New Arrivals)"
                    className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteCollection(i)}
                    className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Button */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              onClick={handleAddCollection}
              className="w-full flex items-center justify-center gap-2.5 py-3 text-sm font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Collection
            </button>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="flex items-center justify-between">
          {saved && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-xs">✓</span>
              Changes saved
            </div>
          )}
          <div className="ml-auto">
            <Button
              onClick={handleSave}
              className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <Save className="w-4 h-4" />
              Save Collections
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
