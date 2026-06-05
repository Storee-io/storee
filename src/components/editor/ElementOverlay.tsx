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

// Elements to skip (too small, utility, or not meaningful)
function shouldSkip(el: Element): boolean {
  if (el.tagName === 'SVG' || el.tagName === 'PATH' || el.tagName === 'CIRCLE') return true;
  if (el.tagName === 'SPAN' && !el.className) return true;
  if (el.tagName === 'BUTTON') return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 16 || rect.height < 16) return true;
  return false;
}

interface ElementOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editMode: boolean;
}

export default function ElementOverlay({ containerRef, editMode }: ElementOverlayProps) {
  const [hovered, setHovered] = useState<{ rect: Rect; label: string } | null>(null);
  const [selected, setSelected] = useState<{ rect: Rect; label: string } | null>(null);
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

      // Walk up to find best candidate div/section/article
      let el: Element | null = target;
      while (el && el !== container) {
        const tag = el.tagName.toLowerCase();
        if ((tag === 'div' || tag === 'section' || tag === 'article' || tag === 'header' || tag === 'footer') && !shouldSkip(el)) {
          break;
        }
        el = el.parentElement;
      }

      if (!el || el === container) { setHovered(null); return; }
      if (el === lastHoveredEl.current) return;

      lastHoveredEl.current = el;
      setHovered({ rect: getRelativeRect(el, container), label: getLabel(el) });
    };

    const handleMouseLeave = () => { setHovered(null); lastHoveredEl.current = null; };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || !container.contains(target)) return;

      // If clicking an editable field, don't intercept
      if ((target as HTMLElement).isContentEditable) return;
      if (target.closest('[contenteditable]')) return;

      let el: Element | null = target;
      while (el && el !== container) {
        const tag = el.tagName.toLowerCase();
        if ((tag === 'div' || tag === 'section' || tag === 'article' || tag === 'header' || tag === 'footer') && !shouldSkip(el)) {
          break;
        }
        el = el.parentElement;
      }

      if (!el || el === container) { setSelected(null); lastSelectedEl.current = null; return; }

      // Click same = deselect
      if (el === lastSelectedEl.current) {
        setSelected(null);
        lastSelectedEl.current = null;
        return;
      }

      lastSelectedEl.current = el;
      setSelected({ rect: getRelativeRect(el, container), label: getLabel(el) });
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
      {/* Hover overlay — semi-transparent fill + subtle border */}
      {hovered && (!selected || hovered.label !== selected.label) && (
        <div
          style={{
            position: 'absolute',
            top: hovered.rect.top,
            left: hovered.rect.left,
            width: hovered.rect.width,
            height: hovered.rect.height,
            background: 'rgba(99, 120, 255, 0.08)',
            outline: '1px solid rgba(99, 120, 255, 0.35)',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        >
          <span style={{
            position: 'absolute',
            top: -20,
            left: 0,
            background: 'rgba(99, 120, 255, 0.18)',
            color: '#4f46e5',
            fontSize: 10,
            fontFamily: 'monospace',
            padding: '1px 5px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {hovered.label}
          </span>
        </div>
      )}

      {/* Selected overlay — outline only, no fill */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: selected.rect.top,
            left: selected.rect.left,
            width: selected.rect.width,
            height: selected.rect.height,
            outline: '2px solid #3b82f6',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        >
          <span style={{
            position: 'absolute',
            top: -22,
            left: -1,
            background: '#3b82f6',
            color: '#fff',
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '3px 3px 0 0',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            pointerEvents: 'none',
          }}>
            {selected.label}
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.8 }}>
              <path d="M2 5h6M5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}
