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
  const scrollTop = (container as HTMLElement).scrollTop || 0;
  return {
    top: elRect.top - containerRect.top + scrollTop,
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

type ElType = 'span' | 'text' | 'block';

function getElType(el: Element): ElType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'span' || tag === 'a' || tag === 'strong' || tag === 'em') return 'span';
  if (TEXT_TAGS.has(tag)) return 'text';
  return 'block';
}

function isTextEl(el: Element): boolean {
  return TEXT_TAGS.has(el.tagName.toLowerCase());
}

function isBlockEl(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName.toLowerCase()) || el.tagName.toLowerCase() === 'button';
}

const TYPE_COLORS: Record<ElType, { hover: string; outline: string; label: string; text: string }> = {
  span:  { hover: 'rgba(16,185,129,0.07)',  outline: 'rgba(16,185,129,0.5)',  label: '#10b981', text: '#fff' },
  text:  { hover: 'rgba(245,158,11,0.07)',  outline: 'rgba(245,158,11,0.5)',  label: '#f59e0b', text: '#fff' },
  block: { hover: 'rgba(99,120,255,0.07)',  outline: 'rgba(99,120,255,0.45)', label: '#6366f1', text: '#fff' },
};

interface HoverInfo { rect: Rect; label: string; elType: ElType; }

interface ElementOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editMode: boolean;
}

function findTarget(startEl: Element, container: Element): Element | null {
  let el: Element | null = startEl;
  while (el && el !== container) {
    // Skip elements that are EditSpan fields (they have their own selection UI)
    if ((el as HTMLElement).dataset?.editorField !== undefined) return null;
    if (el.closest('[data-editor-field]')) return null;
    // Allow span/inline elements and block elements, skip text blocks (p, h1-h6, etc.)
    const tag = el.tagName.toLowerCase();
    if (!shouldSkip(el) && (tag === 'span' || tag === 'a' || tag === 'strong' || tag === 'em' || isBlockEl(el))) return el;
    el = el.parentElement;
  }
  return null;
}

export default function ElementOverlay({ containerRef, editMode }: ElementOverlayProps) {
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const lastSelectedEl = useRef<Element | null>(null);

  // Update selected rect on scroll/resize
  const updateSelectedRect = useCallback(() => {
    if (!lastSelectedEl.current || !containerRef.current) return;
    const rect = getRelativeRect(lastSelectedEl.current, containerRef.current);
    setSelected(prev => prev ? { ...prev, rect } : null);
  }, [containerRef]);

  useEffect(() => {
    if (!editMode) {
      setSelected(null);
      lastSelectedEl.current = null;
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || !container.contains(target)) return;

      // If clicking an editable field, don't intercept
      if ((target as HTMLElement).isContentEditable) return;
      if (target.closest('[contenteditable]')) return;

      const el = findTarget(target, container);
      if (!el) { setSelected(null); lastSelectedEl.current = null; return; }

      // Click same = deselect
      if (el === lastSelectedEl.current) {
        setSelected(null);
        lastSelectedEl.current = null;
        return;
      }

      lastSelectedEl.current = el;
      setSelected({ rect: getRelativeRect(el, container), label: getLabel(el), elType: getElType(el) });
    };

    // Click outside = deselect
    const handleDocClick = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        setSelected(null);
        lastSelectedEl.current = null;
      }
    };

    // Use capture phase so events fire before framer-motion Reorder intercepts them
    container.addEventListener('click', handleClick, true);
    document.addEventListener('click', handleDocClick);
    container.addEventListener('scroll', updateSelectedRect);
    window.addEventListener('resize', updateSelectedRect);

    return () => {
      container.removeEventListener('click', handleClick, true);
      document.removeEventListener('click', handleDocClick);
      container.removeEventListener('scroll', updateSelectedRect);
      window.removeEventListener('resize', updateSelectedRect);
    };
  }, [editMode, containerRef, updateSelectedRect]);

  if (!editMode) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden' }}>
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
