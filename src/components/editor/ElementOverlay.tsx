'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Rect { top: number; left: number; width: number; height: number; }

function getLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = el.className && typeof el.className === 'string'
    ? el.className.split(' ').find(c => c.length > 0 && c.length < 20)
    : '';
  return cls ? `${tag}.${cls}` : tag;
}

function getRelativeRect(el: Element, container: Element): Rect {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  // Overlay is position:absolute inside overflow:auto container, so it covers
  // the full scrollable content area — positions must include scroll offset.
  const scrollTop = (container as HTMLElement).scrollTop || 0;
  const scrollLeft = (container as HTMLElement).scrollLeft || 0;
  return {
    top: elRect.top - containerRect.top + scrollTop,
    left: elRect.left - containerRect.left + scrollLeft,
    width: elRect.width,
    height: elRect.height,
  };
}

const BLOCK_TAGS = new Set(['div','section','article','header','footer','main','aside','nav','form','ul','ol','li','table','tbody','tr','td','th','svg','p','h1','h2','h3','h4','h5','h6']);
const TEXT_TAGS = new Set(['p','h1','h2','h3','h4','h5','h6','span','a','strong','em','label','blockquote']);

// Elements to skip (too small, utility, or not meaningful)
function shouldSkip(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  // Skip only internal SVG path elements, not the SVG container itself
  if (tag === 'path' || tag === 'circle' || tag === 'g' || tag === 'rect' || tag === 'polyline') return true;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return true;
  return false;
}

// All sections are now selectable in edit mode (including products)
function isInExcludedSection(el: Element): boolean {
  return false;
}

type ElType = 'span' | 'a' | 'text' | 'div' | 'section' | 'button' | 'svg';

function getElType(el: Element): ElType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'span') return 'span';
  if (tag === 'a') return 'a';
  if (tag === 'svg') return 'svg';
  if (tag === 'button') return 'button';
  if (tag === 'div') return 'div';
  if (tag === 'section' || tag === 'article' || tag === 'header' || tag === 'footer') return 'section';
  if (TEXT_TAGS.has(tag)) return 'text';
  return 'div';
}

function isBlockEl(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName.toLowerCase()) || el.tagName.toLowerCase() === 'button';
}

const TYPE_COLORS: Record<ElType, { hover: string; outline: string; label: string }> = {
  span:    { hover: 'rgba(16,185,129,0.07)',   outline: 'rgba(16,185,129,0.5)',   label: '#10b981' },
  a:       { hover: 'rgba(59,130,246,0.07)',   outline: 'rgba(59,130,246,0.5)',   label: '#3b82f6' },
  text:    { hover: 'rgba(245,158,11,0.07)',   outline: 'rgba(245,158,11,0.5)',   label: '#f59e0b' },
  div:     { hover: 'rgba(99,120,255,0.07)',   outline: 'rgba(99,120,255,0.45)',  label: '#6366f1' },
  section: { hover: 'rgba(168,85,247,0.07)',   outline: 'rgba(168,85,247,0.5)',   label: '#a855f7' },
  button:  { hover: 'rgba(239,68,68,0.07)',    outline: 'rgba(239,68,68,0.5)',    label: '#ef4444' },
  svg:     { hover: 'rgba(34,197,94,0.07)',    outline: 'rgba(34,197,94,0.5)',    label: '#22c55e' },
};

interface HoverInfo { rect: Rect; label: string; elType: ElType; }

interface ElementOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editMode: boolean;
}

function findTarget(startEl: Element, container: Element): Element | null {
  // Quick containment check using ancestor walk (avoids container.contains() reference issues)
  let check: Element | null = startEl;
  let insideContainer = false;
  while (check) {
    if (check === container) { insideContainer = true; break; }
    check = check.parentElement;
  }
  if (!insideContainer) return null;

  let el: Element | null = startEl;
  let firstMatch: Element | null = null;

  while (el && el !== container) {
    if ((el as HTMLElement).dataset?.editorField !== undefined) return null;
    if (el.closest('[data-editor-field]')) return null;
    if (isInExcludedSection(el)) return null;

    const tag = el.tagName.toLowerCase();
    const isSelectable = !shouldSkip(el) && (tag === 'span' || tag === 'a' || tag === 'strong' || tag === 'em' || isBlockEl(el));

    if (isSelectable) {
      // Store first match (innermost selectable)
      if (!firstMatch) firstMatch = el;

      // Prefer inline text elements (span, a, etc.) over block containers
      // Return immediately to avoid walking up to p/h1-h6/div
      const tag = el.tagName.toLowerCase();
      if (tag === 'span' || tag === 'a' || tag === 'strong' || tag === 'em') {
        return el;
      }

      // Check if this is a product card container
      // Pattern 1: .group.cursor-pointer class (most specific)
      const hasGroupCursorPointer = el.classList.contains('group') && el.classList.contains('cursor-pointer');
      if (hasGroupCursorPointer) {
        return el;
      }

      // Stop at section boundaries - don't walk past data-editor-section
      if (el.hasAttribute('data-editor-section')) {
        return firstMatch || el;
      }
    }

    el = el.parentElement;
  }

  // Return innermost selectable match
  return firstMatch;
}

export default function ElementOverlay({ containerRef, editMode }: ElementOverlayProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const lastHoveredEl = useRef<Element | null>(null);
  const lastSelectedEl = useRef<Element | null>(null);

  const updateOverlayHeight = useCallback(() => {
    if (containerRef.current) {
      setOverlayHeight(containerRef.current.scrollHeight);
    }
  }, [containerRef]);

  const updateSelectedRect = useCallback(() => {
    updateOverlayHeight();
    if (!lastSelectedEl.current || !containerRef.current) return;
    const rect = getRelativeRect(lastSelectedEl.current, containerRef.current);
    setSelected(prev => prev ? { ...prev, rect } : null);
    if (lastHoveredEl.current && containerRef.current) {
      const hRect = getRelativeRect(lastHoveredEl.current, containerRef.current);
      setHovered(prev => prev ? { ...prev, rect: hRect } : null);
    }
  }, [containerRef, updateOverlayHeight]);

  useEffect(() => {
    if (!editMode) {
      setHovered(null);
      setSelected(null);
      lastHoveredEl.current = null;
      lastSelectedEl.current = null;
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Set initial overlay height to cover full scrollable content
    updateOverlayHeight();

    // e.target from document mousemove correctly respects pointer-events:none on the overlay.
    // We rely on findTarget's DOM walk to scope results to within the container —
    // elements outside (sidebar etc.) will naturally return null when walking up past container.
    const getTarget = (e: MouseEvent): Element | null => {
      const target = e.target as Element;
      if (!target) return null;
      if (target.closest('[data-overlay]')) return null;
      return target;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = getTarget(e);
      if (!target) { setHovered(null); lastHoveredEl.current = null; return; }

      const el = findTarget(target, container);
      if (!el) { setHovered(null); lastHoveredEl.current = null; return; }
      if (el === lastHoveredEl.current) return;

      lastHoveredEl.current = el;
      setHovered({ rect: getRelativeRect(el, container), label: getLabel(el), elType: getElType(el) });
    };

    const handleMouseLeave = () => { setHovered(null); lastHoveredEl.current = null; };

    const handleClick = (e: MouseEvent) => {
      const target = getTarget(e);
      if (!target) return;
      if ((target as HTMLElement).isContentEditable) return;
      if (target.closest('[contenteditable]')) return;

      const el = findTarget(target, container);
      if (!el) { setSelected(null); lastSelectedEl.current = null; return; }

      if (el === lastSelectedEl.current) {
        setSelected(null);
        lastSelectedEl.current = null;
        return;
      }

      lastSelectedEl.current = el;
      setSelected({ rect: getRelativeRect(el, container), label: getLabel(el), elType: getElType(el) });
    };

    const handleDocClick = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        setSelected(null);
        lastSelectedEl.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('click', handleDocClick);
    container.addEventListener('scroll', updateSelectedRect);
    window.addEventListener('resize', updateSelectedRect);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('click', handleDocClick);
      container.removeEventListener('scroll', updateSelectedRect);
      window.removeEventListener('resize', updateSelectedRect);
    };
  }, [editMode, containerRef, updateSelectedRect, updateOverlayHeight]);

  if (!editMode) return null;

  return (
    <div data-overlay="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: overlayHeight || '100%', pointerEvents: 'none', zIndex: 40, overflow: 'visible' }}>
      {/* Hover overlay — semi-transparent fill */}
      {hovered && hovered.rect.width > 0 && (() => {
        const c = TYPE_COLORS[hovered.elType];
        return (
          <div style={{
            position: 'absolute',
            top: hovered.rect.top, left: hovered.rect.left,
            width: hovered.rect.width, height: hovered.rect.height,
            background: c.hover,
            outline: `1px solid ${c.outline}`,
            borderRadius: 2, pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute', top: -20, left: 0,
              background: c.label + '22',
              color: c.label,
              fontSize: 10, fontFamily: 'monospace',
              padding: '1px 5px', borderRadius: 3,
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              {hovered.label}
            </span>
          </div>
        );
      })()}

      {/* Selected overlay — outline only, no fill */}
      {selected && selected.rect.width > 0 && (() => {
        const c = TYPE_COLORS[selected.elType];
        return (
          <div style={{
            position: 'absolute',
            top: selected.rect.top, left: selected.rect.left,
            width: selected.rect.width, height: selected.rect.height,
            outline: `2px solid ${c.label}`,
            borderRadius: 2, pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute', top: -22, left: -1,
              background: c.label,
              color: '#fff',
              fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '3px 3px 0 0',
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              {selected.label}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
