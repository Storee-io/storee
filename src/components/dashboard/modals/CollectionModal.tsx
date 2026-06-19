'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Collection } from '../../../data/storeDataGenerator';

interface CollectionModalProps {
  isOpen: boolean;
  collections: Collection[];
  selectedCollection?: string;
  onClose: () => void;
  onSelect: (collectionId: string) => void;
  onAddCollection: (name: string, emoji: string) => void;
  onDeleteCollection: (id: string) => void;
}

export function CollectionModal({
  isOpen,
  collections,
  selectedCollection,
  onClose,
  onSelect,
  onAddCollection,
  onDeleteCollection,
}: CollectionModalProps) {
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionEmoji, setNewCollectionEmoji] = useState('✨');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCollection = () => {
    if (newCollectionName.trim()) {
      onAddCollection(newCollectionName, newCollectionEmoji);
      setNewCollectionName('');
      setNewCollectionEmoji('✨');
      setShowAddForm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Select Collection</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Collections List */}
          <div className="space-y-2 mb-6">
            {collections.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No collections yet</p>
            ) : (
              collections.map(collection => (
                <div
                  key={collection.id}
                  onClick={() => onSelect(collection.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    selectedCollection === collection.id
                      ? 'bg-emerald-50 border border-emerald-300'
                      : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedCollection === collection.id && (
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                    <span className="text-xl">{collection.emoji}</span>
                    <span className="text-sm font-medium text-slate-900">{collection.name}</span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteCollection(collection.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Collection */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-emerald-600 border border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Collection
            </button>
          ) : (
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCollectionEmoji}
                  onChange={e => setNewCollectionEmoji(e.target.value.slice(0, 2))}
                  maxLength={2}
                  className="w-14 text-center text-xl px-2 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCollection();
                    if (e.key === 'Escape') {
                      setShowAddForm(false);
                      setNewCollectionName('');
                      setNewCollectionEmoji('✨');
                    }
                  }}
                  placeholder="Collection name"
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCollection}
                  disabled={!newCollectionName.trim()}
                  className="flex-1 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCollectionName('');
                    setNewCollectionEmoji('✨');
                  }}
                  className="flex-1 py-2 text-sm font-semibold bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}
