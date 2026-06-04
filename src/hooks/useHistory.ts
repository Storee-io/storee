'use client';

import { useState, useCallback } from 'react';
import type { StoreDesign } from '@/lib/claudeApi';
import type { HistorySnapshot, HistoryState, UseHistoryReturn } from '@/types/history';

const MAX_SNAPSHOTS = 50;

export function useHistory(
  initialDesign: StoreDesign,
  storeId: string,
  initialStoreName?: string
): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryState>({
    snapshots: [
      {
        storeId,
        design: initialDesign,
        storeName: initialStoreName,
        metadata: {
          timestamp: Date.now(),
          label: 'Initial state',
          source: 'user_action',
        },
      },
    ],
    currentIndex: 0,
    maxSnapshots: MAX_SNAPSHOTS,
  });

  const pushSnapshot = useCallback(
    (design: StoreDesign, storeName?: string, label?: string) => {
      setHistory((prev) => {
        // Don't create duplicate consecutive snapshots
        if (prev.currentIndex < prev.snapshots.length - 1) {
          // If user is not at the latest, truncate future history
          prev.snapshots = prev.snapshots.slice(0, prev.currentIndex + 1);
        }

        const lastSnapshot = prev.snapshots[prev.snapshots.length - 1];

        // Check if design actually changed
        if (JSON.stringify(lastSnapshot.design) === JSON.stringify(design)) {
          return prev;
        }

        const newSnapshot: HistorySnapshot = {
          storeId,
          design,
          storeName: storeName || prev.snapshots[prev.currentIndex]?.storeName,
          metadata: {
            timestamp: Date.now(),
            label: label || detectChanges(lastSnapshot.design, design),
            source: 'autosave',
          },
        };

        const newSnapshots = [...prev.snapshots, newSnapshot];

        // Enforce max snapshots limit
        if (newSnapshots.length > MAX_SNAPSHOTS) {
          newSnapshots.shift();
        }

        return {
          ...prev,
          snapshots: newSnapshots,
          currentIndex: newSnapshots.length - 1,
        };
      });
    },
    [storeId]
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.currentIndex <= 0) return prev;
      return { ...prev, currentIndex: prev.currentIndex - 1 };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.currentIndex >= prev.snapshots.length - 1) return prev;
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, []);

  const goToVersion = useCallback((index: number) => {
    setHistory((prev) => {
      if (index < 0 || index >= prev.snapshots.length) return prev;
      return { ...prev, currentIndex: index };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory((prev) => ({
      ...prev,
      snapshots: [prev.snapshots[prev.currentIndex]],
      currentIndex: 0,
    }));
  }, []);

  const currentSnapshot = history.snapshots[history.currentIndex] || null;

  return {
    snapshots: history.snapshots,
    currentIndex: history.currentIndex,
    currentSnapshot,
    canUndo: history.currentIndex > 0,
    canRedo: history.currentIndex < history.snapshots.length - 1,
    pushSnapshot,
    undo,
    redo,
    goToVersion,
    clearHistory,
  };
}

/**
 * Auto-detect what changed between two design objects
 */
function detectChanges(prev: StoreDesign, curr: StoreDesign): string {
  const changes: string[] = [];

  if (prev.heroTitle !== curr.heroTitle) changes.push('Headline');
  if (prev.heroSubtitle !== curr.heroSubtitle) changes.push('Subheadline');
  if (prev.accentColor !== curr.accentColor) changes.push('Color');
  if (prev.tagline !== curr.tagline) changes.push('Tagline');
  if (prev.brandStory !== curr.brandStory) changes.push('Brand story');
  if (prev.footerNote !== curr.footerNote) changes.push('Footer');

  // Array length changes
  if (prev.features?.length !== curr.features?.length) changes.push('Features');
  if (prev.testimonials?.length !== curr.testimonials?.length) changes.push('Testimonials');
  if (prev.faq?.length !== curr.faq?.length) changes.push('FAQ');
  if (prev.trustBadges?.length !== curr.trustBadges?.length) changes.push('Trust badges');
  if (prev.stats?.length !== curr.stats?.length) changes.push('Stats');

  return changes.length > 0 ? `${changes.join(', ')} changed` : 'Updated';
}
