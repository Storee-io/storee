'use client';

import { useState, useCallback } from 'react';
import type { StoreDesign } from '../lib/claudeApi';
import type { HistorySnapshot, HistoryState, UseHistoryReturn } from '../types/history';

const MAX_SNAPSHOTS = 50;

export function useHistory(
  initialDesign: StoreDesign,
  storeId: string,
  initialStoreName?: string,
  initialPrimaryColor?: string
): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryState>({
    snapshots: [
      {
        storeId,
        design: initialDesign,
        storeName: initialStoreName,
        primaryColor: initialPrimaryColor,
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
    (design: StoreDesign, storeName?: string, primaryColor?: string, label?: string) => {
      setHistory((prev) => {
        // Don't create duplicate consecutive snapshots
        if (prev.currentIndex < prev.snapshots.length - 1) {
          // If user is not at the latest, truncate future history
          prev.snapshots = prev.snapshots.slice(0, prev.currentIndex + 1);
        }

        const lastSnapshot = prev.snapshots[prev.snapshots.length - 1];

        // Check if design, storeName, or primaryColor actually changed
        const designChanged = JSON.stringify(lastSnapshot.design) !== JSON.stringify(design);
        const storeNameChanged = storeName !== undefined && storeName !== lastSnapshot.storeName;
        const primaryColorChanged = primaryColor !== undefined && primaryColor !== lastSnapshot.primaryColor;

        if (!designChanged && !storeNameChanged && !primaryColorChanged) {
          return prev;
        }

        const newSnapshot: HistorySnapshot = {
          storeId,
          design,
          storeName: storeName ?? prev.snapshots[prev.currentIndex]?.storeName,
          primaryColor: primaryColor ?? prev.snapshots[prev.currentIndex]?.primaryColor,
          metadata: {
            timestamp: Date.now(),
            label: label || detectChanges(lastSnapshot, { design, storeName, primaryColor }),
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
 * Auto-detect what changed between two snapshots
 */
function detectChanges(
  prev: HistorySnapshot,
  curr: { design: StoreDesign; storeName?: string; primaryColor?: string }
): string {
  const changes: string[] = [];
  const pd = prev.design;
  const cd = curr.design;

  if (prev.storeName !== curr.storeName) changes.push('Store name');
  if (prev.primaryColor !== curr.primaryColor) changes.push('Primary color');

  if (pd.heroTitle !== cd.heroTitle) changes.push('Headline');
  if (pd.heroSubtitle !== cd.heroSubtitle) changes.push('Subheadline');
  if (pd.ctaText !== cd.ctaText) changes.push('CTA button');
  if (pd.accentColor !== cd.accentColor) changes.push('Accent color');
  if (pd.tagline !== cd.tagline) changes.push('Tagline');
  if (pd.brandStory !== cd.brandStory) changes.push('Brand story');
  if (pd.footerNote !== cd.footerNote) changes.push('Footer');
  if (pd.promoBar !== cd.promoBar) changes.push('Promo bar');

  // Section order
  if (JSON.stringify(pd.sectionOrder) !== JSON.stringify(cd.sectionOrder)) changes.push('Section order');

  // Array length changes
  if (pd.features?.length !== cd.features?.length) changes.push('Features');
  if (pd.testimonials?.length !== cd.testimonials?.length) changes.push('Testimonials');
  if (pd.faq?.length !== cd.faq?.length) changes.push('FAQ');
  if (pd.trustBadges?.length !== cd.trustBadges?.length) changes.push('Trust badges');
  if (pd.stats?.length !== cd.stats?.length) changes.push('Stats');

  // Array content changes (when length same)
  if (pd.features?.length === cd.features?.length && JSON.stringify(pd.features) !== JSON.stringify(cd.features)) changes.push('Features');
  if (pd.testimonials?.length === cd.testimonials?.length && JSON.stringify(pd.testimonials) !== JSON.stringify(cd.testimonials)) changes.push('Testimonials');
  if (pd.faq?.length === cd.faq?.length && JSON.stringify(pd.faq) !== JSON.stringify(cd.faq)) changes.push('FAQ');
  if (pd.trustBadges?.length === cd.trustBadges?.length && JSON.stringify(pd.trustBadges) !== JSON.stringify(cd.trustBadges)) changes.push('Trust badges');
  if (pd.stats?.length === cd.stats?.length && JSON.stringify(pd.stats) !== JSON.stringify(cd.stats)) changes.push('Stats');

  // Element resize / position overrides
  const prevOv = pd.elementOverrides ?? {};
  const currOv = cd.elementOverrides ?? {};
  if (JSON.stringify(prevOv) !== JSON.stringify(currOv)) {
    // Find which selectors changed and produce human-readable labels
    const resized: string[] = [];
    const allKeys = new Set([...Object.keys(prevOv), ...Object.keys(currOv)]);
    allKeys.forEach(key => {
      if (JSON.stringify(prevOv[key]) !== JSON.stringify(currOv[key])) {
        // key format: "tagName|className" → extract tag + first meaningful class
        const pipeIdx = key.indexOf('|');
        const tag = pipeIdx > -1 ? key.slice(0, pipeIdx) : key;
        const className = pipeIdx > -1 ? key.slice(pipeIdx + 1) : '';
        // Pick the first non-positional Tailwind class as a short identifier
        const shortClass = className
          .split(' ')
          .find(c => c && !['flex','grid','items-center','justify-center','relative','absolute','overflow','w-full','h-full'].some(skip => c.startsWith(skip)));
        const label = shortClass ? `${tag}.${shortClass}` : tag;

        // Describe what changed (size vs position)
        const pv = prevOv[key] ?? {};
        const cv = currOv[key] ?? {};
        const sizeChanged = pv.width !== cv.width || pv.height !== cv.height;
        const posChanged  = pv.marginTop !== cv.marginTop || pv.marginLeft !== cv.marginLeft;
        const action = sizeChanged && posChanged ? 'resized & moved'
                     : sizeChanged ? 'resized'
                     : posChanged  ? 'moved'
                     : 'updated';

        resized.push(`${label} ${action}`);
      }
    });
    if (resized.length) changes.push(...resized);
  }

  // Deduplicate
  const unique = Array.from(new Set(changes));
  return unique.length > 0 ? `${unique.join(', ')}` : 'Updated';
}
