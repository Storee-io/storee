'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Rect { top: number; left: number; width: number; height: number; }

type HandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 10;
const HANDLE_COLOR = '#1e90ff';
const SELECTION_COLOR = '#1e90ff';

const HANDLE_CURSORS: Record<HandlePos, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize',
  sw: 'nesw-resize', w: 'ew-resize',
};

function getHandlePosition(pos: HandlePos, rect: Rect) {
  const h = HANDLE_SIZE / 2;
  const { top, left, width, height } = rect;
  const cx = left + width / 2;
  const cy = top + height / 2;
  const r = left + width;
  const b = top + height;
  const map: Record<HandlePos, { top: number; left: number }> = {
    nw: { top: top - h, left: left - h },
    n:  { top: top - h, left: cx - h },
    ne: { top: top - h, left: r - h },
    e:  { top: cy - h,  left: r - h },
    se: { top: b - h,   left: r - h },
    s:  { top: b - h,   left: cx - h },
    sw: { top: b - h,   left: left - h },
    w:  { top: cy - h,  left: left - h },
  };
  return map[pos];
}

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

function shouldSkip(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'path' || tag === 'circle' || tag === 'g' || tag === 'rect' || tag === 'polyline') return true;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return true;
  return false;
}

function isInExcludedSection(_el: Element): boolean { return false; }

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

export type ElementStyleOverride = {
  width?: string;
  height?: string;
  marginTop?: string;
  marginLeft?: string;
  /** Human-readable label for version history, e.g. "Product card" */
  humanLabel?: string;
};

interface ElementOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editMode: boolean;
  /** Saved overrides to restore on load: Record<"tagName|className", styles> */
  elementOverrides?: Record<string, ElementStyleOverride>;
  /** Called after each resize drag with the new override for that element */
  onElementOverride?: (selector: string, styles: ElementStyleOverride) => void;
}

/** Build a stable selector key for an element: "tagName|className" */
function buildSelector(el: Element): string {
  return `${el.tagName.toLowerCase()}|${el.className}`;
}

/** Derive a human-readable label for an element based on its tag, classes, and parent section */
function buildHumanLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = (el.className || '').toLowerCase();

  // 1. Check parent section via data-editor-section attribute
  let sectionName = '';
  let ancestor = el.parentElement;
  while (ancestor) {
    const sec = ancestor.getAttribute('data-editor-section');
    if (sec) { sectionName = sec; break; }
    ancestor = ancestor.parentElement;
  }

  // Map data-editor-section values → friendly names
  const SECTION_LABELS: Record<string, string> = {
    hero: 'Hero', trust: 'Trust badges', collections: 'Collections',
    products: 'Products', features: 'Features', testimonials: 'Testimonials',
    stats: 'Stats', brandStory: 'Brand story', faq: 'FAQ',
    newsletter: 'Newsletter', promoBar: 'Promo bar', footer: 'Footer',
    scrollingBanner: 'Banner', instagramFeed: 'Instagram feed',
  };

  // 2. Classify by class keywords
  const CLASS_KEYWORDS: Array<[string, string]> = [
    ['product-card', 'Product card'], ['product', 'Product card'],
    ['trust', 'Trust badge'], ['testimonial', 'Testimonial'],
    ['feature', 'Feature card'], ['hero', 'Hero'],
    ['footer', 'Footer'], ['nav', 'Navigation'],
    ['banner', 'Banner'], ['badge', 'Badge'],
    ['card', 'Card'], ['grid', 'Grid'],
    ['carousel', 'Carousel'], ['stat', 'Stat'],
    ['faq', 'FAQ'], ['newsletter', 'Newsletter'],
    ['collection', 'Collection'], ['category', 'Category'],
  ];

  // 3. Classify by tag
  const TAG_LABELS: Record<string, string> = {
    h1: 'Heading', h2: 'Heading', h3: 'Heading', h4: 'Heading',
    h5: 'Heading', h6: 'Heading',
    p: 'Paragraph', span: 'Text',
    button: 'Button', a: 'Link',
    img: 'Image', svg: 'Icon',
    ul: 'List', ol: 'List', li: 'List item',
    section: 'Section', header: 'Header', footer: 'Footer',
    nav: 'Navigation', aside: 'Sidebar',
    form: 'Form', input: 'Input',
  };

  // Build label: element type + section context
  let elementType = '';

  // Try class keywords first
  for (const [keyword, label] of CLASS_KEYWORDS) {
    if (cls.includes(keyword)) { elementType = label; break; }
  }

  // Fall back to tag label
  if (!elementType) elementType = TAG_LABELS[tag] || 'Element';

  // Combine with section context
  const sectionLabel = SECTION_LABELS[sectionName] ?? '';
  if (sectionLabel && !elementType.toLowerCase().includes(sectionLabel.toLowerCase())) {
    return `${sectionLabel} — ${elementType}`;
  }
  return elementType;
}

function findTarget(startEl: Element, container: Element): Element | null {
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
      if (!firstMatch) firstMatch = el;

      if (tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' || tag === 'blockquote') {
        firstMatch = el;
      }

      const hasGroupCursorPointer = el.classList.contains('group') && el.classList.contains('cursor-pointer');
      const hasGroupDiv = tag === 'div' && el.classList.contains('group');
      if (hasGroupCursorPointer || hasGroupDiv) {
        return firstMatch || el;
      }

      if (el.hasAttribute('data-editor-section')) {
        return firstMatch || el;
      }
    }

    el = el.parentElement;
  }

  return firstMatch;
}

interface DragState {
  handle: HandlePos;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startRelRect: Rect; // element rect relative to container at drag start
  startMarginTop: number;  // inline marginTop at drag start (px)
  startMarginLeft: number; // inline marginLeft at drag start (px)
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  el: HTMLElement;
  siblings: HTMLElement[]; // same tag+class elements to sync
  parentRect: DOMRect;
}

export default function ElementOverlay({ containerRef, editMode, elementOverrides, onElementOverride }: ElementOverlayProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const lastHoveredEl = useRef<Element | null>(null);
  const lastSelectedEl = useRef<Element | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false); // Suppress click after drag
  // Direct DOM refs for zero-re-render drag updates
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const selectionBorderRef = useRef<HTMLDivElement | null>(null);
  const handleElsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Apply saved overrides to DOM whenever overrides change (also handles undo/redo restore)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // First pass: clear all previously-applied resize styles from every element
    // (needed when undoing — the old inline styles must be removed before re-applying)
    const OVERRIDE_PROPS = ['width', 'height', 'margin-top', 'margin-left'] as const;
    container.querySelectorAll<HTMLElement>('*').forEach(el => {
      // Only clear elements that had box-sizing set by us (marker that we touched them)
      if (el.style.boxSizing === 'border-box') {
        OVERRIDE_PROPS.forEach(p => { el.style.removeProperty(p); });
        el.style.removeProperty('box-sizing');
      }
    });

    // Second pass: re-apply current overrides
    if (!elementOverrides) return;
    for (const [selector, styles] of Object.entries(elementOverrides)) {
      const pipeIdx = selector.indexOf('|');
      const tag = selector.slice(0, pipeIdx);
      const className = selector.slice(pipeIdx + 1);
      container.querySelectorAll<HTMLElement>(tag).forEach(el => {
        if (el.className === className) {
          if (styles.width)      el.style.width      = styles.width;
          if (styles.height)     el.style.height     = styles.height;
          if (styles.marginTop)  el.style.marginTop  = styles.marginTop;
          if (styles.marginLeft) el.style.marginLeft = styles.marginLeft;
          el.style.boxSizing = 'border-box';
        }
      });
    }
  }, [containerRef, elementOverrides]);

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

  // Resize drag handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: HandlePos) => {
    e.stopPropagation();
    e.preventDefault();
    const el = lastSelectedEl.current as HTMLElement | null;
    if (!el) return;

    const parent = el.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : document.body.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const container = containerRef.current;
    const startRelRect = container ? getRelativeRect(el, container) : { top: 0, left: 0, width: elRect.width, height: elRect.height };

    // Only constrain by parent if parent has fixed/explicit height (not auto-sized by content).
    // For auto-height parents, parentRect.bottom ≈ elRect.bottom which would prevent growing.
    const parentHasFixedHeight = parent ? (parent as HTMLElement).style.height !== '' || parent.scrollHeight > elRect.height * 1.5 : false;
    const maxWidth = parentRect.right - elRect.left;
    const maxHeight = parentHasFixedHeight ? parentRect.bottom - elRect.top : 99999;

    // Find same-type siblings once at drag start (avoid querySelectorAll every frame)
    const siblings: HTMLElement[] = [];
    if (container) {
      const tag = el.tagName.toLowerCase();
      const cls = el.className;
      container.querySelectorAll<HTMLElement>(tag).forEach(s => {
        if (s !== el && s.className === cls) siblings.push(s);
      });
    }

    const startMarginTop = parseFloat(el.style.marginTop) || 0;
    const startMarginLeft = parseFloat(el.style.marginLeft) || 0;

    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: elRect.width,
      startHeight: elRect.height,
      startRelRect,
      startMarginTop,
      startMarginLeft,
      minWidth: 20,
      minHeight: 20,
      maxWidth,
      maxHeight,
      el,
      siblings,
      parentRect,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { handle, startX, startY, startWidth, startHeight, startMarginTop, startMarginLeft, minWidth, minHeight, maxWidth, maxHeight, el } = dragRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newW = startWidth;
      let newH = startHeight;
      let newMarginTop = startMarginTop;
      let newMarginLeft = startMarginLeft;

      if (handle === 'e' || handle === 'ne' || handle === 'se') {
        newW = Math.max(minWidth, Math.min(startWidth + dx, maxWidth));
      }
      if (handle === 'w' || handle === 'nw' || handle === 'sw') {
        // West: grow/shrink left edge, right edge stays fixed
        const clampedDx = Math.min(dx, startWidth - minWidth); // can't shrink past minWidth
        newW = Math.max(minWidth, startWidth - dx);
        newMarginLeft = startMarginLeft + clampedDx;
      }
      if (handle === 's' || handle === 'se' || handle === 'sw') {
        newH = Math.max(minHeight, Math.min(startHeight + dy, maxHeight));
      }
      if (handle === 'n' || handle === 'ne' || handle === 'nw') {
        // North: grow/shrink top edge, bottom edge stays fixed
        const clampedDy = Math.min(dy, startHeight - minHeight); // can't shrink past minHeight
        newH = Math.max(minHeight, startHeight - dy);
        newMarginTop = startMarginTop + clampedDy;
      }

      // Apply size + margin to actual element (siblings get only size — margin is per-element position)
      el.style.width = `${newW}px`;
      el.style.height = `${newH}px`;
      el.style.marginTop = newMarginTop !== 0 ? `${newMarginTop}px` : '';
      el.style.marginLeft = newMarginLeft !== 0 ? `${newMarginLeft}px` : '';
      el.style.boxSizing = 'border-box';
      dragRef.current.siblings.forEach(s => {
        s.style.width = `${newW}px`;
        s.style.height = `${newH}px`;
        s.style.boxSizing = 'border-box';
      });

      // Compute new overlay rect purely from delta — zero getBoundingClientRect calls
      const { startRelRect } = dragRef.current;
      const rect: Rect = {
        top: startRelRect.top + (newMarginTop - startMarginTop),
        left: startRelRect.left + (newMarginLeft - startMarginLeft),
        width: newW,
        height: newH,
      };

      if (selectionBorderRef.current) {
        selectionBorderRef.current.style.top    = `${rect.top}px`;
        selectionBorderRef.current.style.left   = `${rect.left}px`;
        selectionBorderRef.current.style.width  = `${rect.width}px`;
        selectionBorderRef.current.style.height = `${rect.height}px`;
      }
      const handlePositions: HandlePos[] = ['nw','n','ne','e','se','s','sw','w'];
      handlePositions.forEach((pos, i) => {
        const hEl = handleElsRef.current[i];
        if (!hEl) return;
        const { top, left } = getHandlePosition(pos, rect);
        hEl.style.top  = `${top}px`;
        hEl.style.left = `${left}px`;
      });
      const container = containerRef.current;
      if (container && overlayRootRef.current) {
        overlayRootRef.current.style.height = `${container.scrollHeight}px`;
      }
    };

    const onMouseUp = () => {
      if (dragRef.current && containerRef.current) {
        const { el } = dragRef.current;

        // Sync React state
        const rect = getRelativeRect(el, containerRef.current);
        setSelected(prev => prev ? { ...prev, rect } : null);
        setOverlayHeight(containerRef.current.scrollHeight);

        // Emit override for persistence (undo/redo + autosave)
        if (onElementOverride) {
          const styles: ElementStyleOverride = {
            humanLabel: buildHumanLabel(el),
          };
          if (el.style.width)      styles.width      = el.style.width;
          if (el.style.height)     styles.height     = el.style.height;
          if (el.style.marginTop)  styles.marginTop  = el.style.marginTop;
          if (el.style.marginLeft) styles.marginLeft = el.style.marginLeft;
          onElementOverride(buildSelector(el), styles);
        }
      }
      dragRef.current = null;
      didDragRef.current = true;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [containerRef, onElementOverride]);

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

    updateOverlayHeight();

    const getTarget = (e: MouseEvent): Element | null => {
      const target = e.target as Element;
      if (!target) return null;
      if (target.closest('[data-overlay]')) return null;
      return target;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current) return; // Don't update hover during resize
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
      if (dragRef.current) return;
      if (didDragRef.current) { didDragRef.current = false; return; } // Suppress click after drag
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

  const handles: HandlePos[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <div ref={overlayRootRef} data-overlay="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: overlayHeight || '100%', pointerEvents: 'none', zIndex: 40, overflow: 'visible' }}>

      {/* Hover overlay */}
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
              background: c.label + '22', color: c.label,
              fontSize: 10, fontFamily: 'monospace',
              padding: '1px 5px', borderRadius: 3,
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              {hovered.label}
            </span>
          </div>
        );
      })()}

      {/* Selected overlay — Framer style */}
      {selected && selected.rect.width > 0 && (() => {
        const { rect, label, elType } = selected;
        const c = TYPE_COLORS[elType];
        const color = c.label;
        return (
          <>
            {/* Typed-color border */}
            <div ref={selectionBorderRef} style={{
              position: 'absolute',
              top: rect.top, left: rect.left,
              width: rect.width, height: rect.height,
              border: `2px solid ${color}`,
              borderRadius: 2,
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}>
              {/* Label */}
              <span style={{
                position: 'absolute', top: -22, left: -2,
                background: color,
                color: '#fff',
                fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '3px 3px 0 0',
                whiteSpace: 'nowrap', pointerEvents: 'none',
              }}>
                {label}
              </span>
            </div>

            {/* Resize handles */}
            {handles.map((pos, i) => {
              const { top, left } = getHandlePosition(pos, rect);
              return (
                <div
                  key={pos}
                  ref={el => { handleElsRef.current[i] = el; }}
                  data-overlay="true"
                  onMouseDown={(e) => handleResizeStart(e, pos)}
                  style={{
                    position: 'absolute',
                    top, left,
                    width: HANDLE_SIZE, height: HANDLE_SIZE,
                    background: '#fff',
                    border: `2px solid ${color}`,
                    borderRadius: '50%',
                    cursor: HANDLE_CURSORS[pos],
                    pointerEvents: 'auto',
                    zIndex: 41,
                    boxSizing: 'border-box',
                  }}
                />
              );
            })}
          </>
        );
      })()}
    </div>
  );
}
