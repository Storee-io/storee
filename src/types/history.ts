import type { StoreDesign } from './index';

export interface HistoryMetadata {
  timestamp: number;
  label?: string;
  source: 'autosave' | 'manual_save' | 'user_action';
  changeCount?: number;
}

export interface HistorySnapshot {
  id?: string;
  storeId: string;
  design: StoreDesign;
  storeName?: string;
  metadata: HistoryMetadata;
}

export interface HistoryState {
  snapshots: HistorySnapshot[];
  currentIndex: number;
  maxSnapshots: number;
}

export interface UseHistoryReturn {
  snapshots: HistorySnapshot[];
  currentIndex: number;
  currentSnapshot: HistorySnapshot | null;
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: (design: StoreDesign, storeName?: string, label?: string) => void;
  undo: () => void;
  redo: () => void;
  goToVersion: (index: number) => void;
  clearHistory: () => void;
}
