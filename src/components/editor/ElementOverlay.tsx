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
  // Position relative to container's visible top-left (no scrollTop — overlay covers visible area only)
  return {
    top: elRect.top - containerRect.top,
    left: elRect.left - containerRect.left,
    width: elRect.width,
    height: elRect.height,
  };
}

const BLOCK_TAGS = new Set(['div','section','article','header','footer','main','aside','nav','form','ul','ol','li','table','tbody','tr','td','th']);
const TEXT_TAGS = new Set(['p','h1','h2','h3','h4','h5','h6','span','a','strong','em','label','blockquote']);

// Elements to skip (too small, utility, or not meaningful)
function shouldSkip(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'g' || tag === 'rect' || tag === 'polyline') return true;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return true;
  return false;
}

// Skip elements inside products section
function isInProductsSection(el: Element): boolean {
  return !!el.closest('[data-editor-section="products"]');
}

type ElType = 'span' | 'text' | 'block';

function getElType(el: Element): ElType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'span' || tag === 'a' || tag === 'strong' || tag === 'em') return 'span';
  if (TEXT_TAGS.has(tag)) return 'text';
  return 'block';
}

function isBlockEl(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName.toLowerCase()) || el.tagName.toLowerCase() === 'button';
}

const TYPE_COLORS: Record<ElType, { hover: string; outline: string; label: string }> = {
  span:  { hover: 'rgba(16,185,129,0.07)',  outline: 'rgba(16,185,129,0.5)',  label: '#10b981' },
  text:  { hover: 'rgba(245,158,11,0.07)',  outline: 'rgba(245,158,11,0.5)',  label: '#f59e0b' },
  block: { hover: 'rgba(99,120,255,0.07)',  outline: 'rgba(99,120,255,0.45)', label: '#6366f1' },
};

interface HoverInfo { rect: Rect; label: string; elType: ElType; }

interface ElementOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editMode: boolean;
}

function findTarget(startEl: Element, container: Element): Element | null {
  let el: Element | null = startEl;
  while (el && el !== container) {
    if ((el as HTMLElement).dataset?.editorField !== undefined) return null;
    if (el.closest('[data-editor-field]')) return null;
    if (isInProductsSection(el)) return null;
    const tag = el.tagName.toLowerCase();
    if (!shouldSkip(el) && (tag === 'span' || tag === 'a' || tag === 'strong' || tag === 'em' || isBlockEl(el))) return el;
    el = el.parentElement;
  }
  return null;
}

export default function ElementOverlay({ containerRef, editMode }: ElementOverlayProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const lastHoveredEl = useRef<Element | null>(null);
  const lastSelectedEl = useRef<Element | null>(null);

  const updateSelectedRect = useCallback(() => {
    if (!lastSelectedEl.current || !containerRef.current) return;
    const rect = getRelativeRect(lastSelectedEl.current, containerRef.current);
    setSelected(prev => prev ? { ...prev, rect } : null);
    if (lastHoveredEl.current && containerRef.current) {
      const hRect = getRelativeRect(lastHoveredEl.current, containerRef.current);
      setHovered(prev => prev ? { ...prev, rect: hRect } : null);
    }
  }, [containerRef]);

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

    // Check if a point is within the container's bounding rect
    const isInContainer = (x: number, y: number) => {
      const r = container.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    // Get the real DOM element under cursor, skipping the overlay div itself
    const getRealTarget = (x: number, y: number): Element | null => {
      // Use e.target from mousemove — browser resolves pointer-events:none correctly
      // so we just need the element at coordinates inside the container
      const els = document.elementsFromPoint(x, y);
      // Skip our own overlay elements (they have data-overlay attribute)
      for (const el of els) {
        if ((el as HTMLElement).dataset?.overlay) continue;
        if (!container.contains(el) && el !== container) continue;
        return el;
      }
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isInContainer(e.clientX, e.clientY)) {
        setHovered(null);
        lastHoveredEl.current = null;
        return;
      }

      const target = getRealTarget(e.clientX, e.clientY);
      if (!target) { setHovered(null); lastHoveredEl.current = null; return; }

      const el = findTarget(target, container);
      if (!el) { setHovered(null); lastHoveredEl.current = null; return; }
      if (el === lastHoveredEl.current) return;

      lastHoveredEl.current = el;
      setHovered({ rect: getRelativeRect(el, container), label: getLabel(el), elType: getElType(el) });
    };

    const handleMouseLeave = () => { setHovered(null); lastHoveredEl.current = null; };

    const handleClick = (e: MouseEvent) => {
      if (!isInContainer(e.clientX, e.clientY)) return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if ((e.target as Element)?.closest('[contenteditable]')) return;

      const target = getRealTarget(e.clientX, e.clientY);
      if (!target) return;

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
      if (!isInContainer(e.clientX, e.clientY)) {
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
  }, [editMode, containerRef, updateSelectedRect]);

  if (!editMode) return null;

  return (
    <div data-overlay="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden' }}>
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
