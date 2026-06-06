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

function isTextEl(el: Element): boolean {
  return TEXT_TAGS.has(el.tagName.toLowerCase());
}

function isBlockEl(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName.toLowerCase()) || el.tagName.toLowerCase() === 'button';
}

interface HoverInfo { rect: Rect; label: string; isText: boolean; }

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
    if (!shouldSkip(el) && (isTextEl(el) || isBlockEl(el))) return el;
    el = el.parentElement;
  }
  return null;
}

export default function ElementOverlay({ containerRef, editMode }: ElementOverlayProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const lastHoveredEl = useRef<Element | null>(null);
  const lastSelectedEl = useRef<Element | null>(null);

  // Update selected rect on scroll/resize
  const updateSelectedRect = useCallback(() => {
    if (!lastSelectedEl.current || !containerRef.current) return;
    const rect = getRelativeRect(lastSelectedEl.current, containerRef.current);
    setSelected(prev => prev ? { ...prev, rect } : null);
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

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || !container.contains(target)) { setHovered(null); return; }

      const el = findTarget(target, container);
      if (!el) { setHovered(null); return; }
      if (el === lastHoveredEl.current) return;

      lastHoveredEl.current = el;
      setHovered({ rect: getRelativeRect(el, container), label: getLabel(el), isText: isTextEl(el) });
    };

    const handleMouseLeave = () => { setHovered(null); lastHoveredEl.current = null; };

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
      setSelected({ rect: getRelativeRect(el, container), label: getLabel(el), isText: isTextEl(el) });
    };

    // Click outside = deselect
    const handleDocClick = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        setSelected(null);
        lastSelectedEl.current = null;
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('click', handleClick);
    document.addEventListener('click', handleDocClick);
    container.addEventListener('scroll', updateSelectedRect);
    window.addEventListener('resize', updateSelectedRect);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('click', handleClick);
      document.removeEventListener('click', handleDocClick);
      container.removeEventListener('scroll', updateSelectedRect);
      window.removeEventListener('resize', updateSelectedRect);
    };
  }, [editMode, containerRef, updateSelectedRect]);

  if (!editMode) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden' }}>
      {/* Hover overlay */}
      {hovered && hovered.rect.width > 0 && (
        <div style={{
          position: 'absolute',
          top: hovered.rect.top,
          left: hovered.rect.left,
          width: hovered.rect.width,
          height: hovered.rect.height,
          background: hovered.isText ? 'rgba(16, 185, 129, 0.07)' : 'rgba(99, 120, 255, 0.07)',
          outline: hovered.isText ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 120, 255, 0.35)',
          borderRadius: 2,
          pointerEvents: 'none',
        }}>
          <span style={{
            position: 'absolute',
            top: -20, left: 0,
            background: hovered.isText ? 'rgba(16,185,129,0.15)' : 'rgba(99,120,255,0.15)',
            color: hovered.isText ? '#059669' : '#4f46e5',
            fontSize: 10, fontFamily: 'monospace',
            padding: '1px 5px', borderRadius: 3,
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            {hovered.label}
          </span>
        </div>
      )}

      {/* Selected overlay — outline only, no fill */}
      {selected && selected.rect.width > 0 && (
        <div style={{
          position: 'absolute',
          top: selected.rect.top,
          left: selected.rect.left,
          width: selected.rect.width,
          height: selected.rect.height,
          outline: selected.isText ? '2px solid #10b981' : '2px solid #3b82f6',
          borderRadius: 2,
          pointerEvents: 'none',
        }}>
          <span style={{
            position: 'absolute',
            top: -22, left: -1,
            background: selected.isText ? '#10b981' : '#3b82f6',
            color: '#fff',
            fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '3px 3px 0 0',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {selected.label}
          </span>
        </div>
      )}
    </div>
  );
}
