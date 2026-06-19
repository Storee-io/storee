'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Collections() {
  const { storeData, setStoreData } = useStore();
  const [collections, setCollections] = useState(storeData.design.collections || []);
  const [saved, setSaved] = useState(false);

  const handleAddCollection = () => {
    setCollections([...collections, { emoji: '✨', name: '' }]);
  };

  const handleDeleteCollection = (idx: number) => {
    setCollections(collections.filter((_, i) => i !== idx));
  };

  const handleUpdateCollection = (idx: number, field: 'emoji' | 'name', value: string) => {
    setCollections(collections.map((c, i) =>
      i === idx ? { ...c, [field]: value } : c
    ));
  };

  const handleSave = () => {
    setStoreData(prev => ({
      ...prev,
      design: {
        ...prev.design,
        collections,
      }
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Collections</h1>
          <p className="text-sm text-slate-500 mt-1">Organize products into collections with custom names & emojis</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Total Collections</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{collections.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">With Names</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{collections.filter(c => c.name).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Empty Names</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{collections.filter(c => !c.name).length}</p>
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-white rounded-xl border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Collection Items</h2>
        </div>

        {collections.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">No collections yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {collections.map((c, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    <input
                      type="text"
                      value={c.emoji}
                      onChange={e => handleUpdateCollection(i, 'emoji', e.target.value.slice(0, 2))}
                      maxLength={2}
                      className="w-full text-center bg-transparent text-xl font-bold outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={c.name}
                      onChange={e => handleUpdateCollection(i, 'name', e.target.value)}
                      placeholder="Collection name (e.g., New Arrivals)"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteCollection(i)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleAddCollection}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Collection
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <p className="text-sm text-emerald-600 font-medium">✓ Changes saved</p>
        )}
        <Button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Save className="w-4 h-4" />
          Save Collections
        </Button>
      </div>
    </div>
  );
}
