'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Rect { top: number; left: number; width: number; height: number; }

type HandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 10;

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
  const cls = (el.getAttribute('class') || '').split(' ').find(c => c.length > 0 && c.length < 20);
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

/** Parse translate(x, y) from inline transform style */
function parseTranslate(el: HTMLElement): { x: number; y: number } {
  const t = el.style.transform || '';
  const m = t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
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
  /** CSS transform translate, e.g. "translate(40px, -20px)" */
  transform?: string;
  /** Human-readable label for version history, e.g. "Product card" */
  humanLabel?: string;
};

interface ElementOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editMode: boolean;
  /** Saved overrides to restore on load: Record<"tagName|className", styles> */
  elementOverrides?: Record<string, ElementStyleOverride>;
  /** Called after each resize/move drag with the new override for that element */
  onElementOverride?: (selector: string, styles: ElementStyleOverride) => void;
}

/** Build a stable selector key for an element: "tagName|className" */
function buildSelector(el: Element): string {
  return `${el.tagName.toLowerCase()}|${el.getAttribute('class') || ''}`;
}

/** Derive a human-readable label for an element based on its tag, classes, and parent section */
function buildHumanLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = (el.getAttribute('class') || '').toLowerCase();

  let sectionName = '';
  let ancestor = el.parentElement;
  while (ancestor) {
    const sec = ancestor.getAttribute('data-editor-section');
    if (sec) { sectionName = sec; break; }
    ancestor = ancestor.parentElement;
  }

  const SECTION_LABELS: Record<string, string> = {
    hero: 'Hero', trust: 'Trust badges', collections: 'Collections',
    products: 'Products', features: 'Features', testimonials: 'Testimonials',
    stats: 'Stats', brandStory: 'Brand story', faq: 'FAQ',
    newsletter: 'Newsletter', promoBar: 'Promo bar', footer: 'Footer',
    scrollingBanner: 'Banner', instagramFeed: 'Instagram feed',
  };

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

  let elementType = '';
  for (const [keyword, label] of CLASS_KEYWORDS) {
    if (cls.includes(keyword)) { elementType = label; break; }
  }
  if (!elementType) elementType = TAG_LABELS[tag] || 'Element';

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

// ── Drag state for resize ─────────────────────────────────────────────────────
interface DragState {
  handle: HandlePos;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startRelRect: Rect;
  startMarginTop: number;
  startMarginLeft: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  el: HTMLElement;
  siblings: HTMLElement[];
  parentRect: DOMRect;
}

// ── Drag state for move ───────────────────────────────────────────────────────
interface MoveState {
  startX: number;
  startY: number;
  startTranslateX: number;
  startTranslateY: number;
  startRelRect: Rect;
  el: HTMLElement;
}

export default function ElementOverlay({ containerRef, editMode, elementOverrides, onElementOverride }: ElementOverlayProps) {
  const [hovered,       setHovered]       = useState<HoverInfo | null>(null);
  const [selected,      setSelected]      = useState<HoverInfo | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(0);

  const lastHoveredEl  = useRef<Element | null>(null);
  const lastSelectedEl = useRef<Element | null>(null);
  const dragRef        = useRef<DragState | null>(null);  // resize
  const moveRef        = useRef<MoveState | null>(null);  // move
  const didDragRef     = useRef(false);
  const moveRafRef     = useRef<number | null>(null);     // rAF id for move throttle

  // Direct DOM refs — zero re-renders during drag/move
  const overlayRootRef    = useRef<HTMLDivElement | null>(null);
  const selectionBorderRef = useRef<HTMLDivElement | null>(null);
  const handleElsRef      = useRef<(HTMLDivElement | null)[]>([]);

  // ── Apply / clear overrides on load and undo/redo ──────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear all previously-applied override styles (marker: data-overridden attribute)
    container.querySelectorAll<HTMLElement>('[data-overridden]').forEach(el => {
      el.style.removeProperty('width');
      el.style.removeProperty('height');
      el.style.removeProperty('margin-top');
      el.style.removeProperty('margin-left');
      el.style.removeProperty('transform');
      el.style.removeProperty('box-sizing');
      el.removeAttribute('data-overridden');
    });

    if (!elementOverrides) return;

    for (const [selector, styles] of Object.entries(elementOverrides)) {
      const pipeIdx = selector.indexOf('|');
      const tag = selector.slice(0, pipeIdx);
      const className = selector.slice(pipeIdx + 1);
      container.querySelectorAll<HTMLElement>(tag).forEach(el => {
        if ((el.getAttribute('class') || '') === className) {
          if (styles.width)      el.style.width      = styles.width;
          if (styles.height)     el.style.height     = styles.height;
          if (styles.marginTop)  el.style.marginTop  = styles.marginTop;
          if (styles.marginLeft) el.style.marginLeft = styles.marginLeft;
          if (styles.transform)  el.style.transform  = styles.transform;
          el.style.boxSizing = 'border-box';
          el.setAttribute('data-overridden', '1');
        }
      });
    }
  }, [containerRef, elementOverrides]);

  const updateOverlayHeight = useCallback(() => {
    if (containerRef.current) setOverlayHeight(containerRef.current.scrollHeight);
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

  // ── Helper: emit override after resize or move ────────────────────────────
  const emitOverride = useCallback((el: HTMLElement) => {
    if (!onElementOverride) return;
    const styles: ElementStyleOverride = { humanLabel: buildHumanLabel(el) };
    if (el.style.width)      styles.width      = el.style.width;
    if (el.style.height)     styles.height     = el.style.height;
    if (el.style.marginTop)  styles.marginTop  = el.style.marginTop;
    if (el.style.marginLeft) styles.marginLeft = el.style.marginLeft;
    if (el.style.transform)  styles.transform  = el.style.transform;
    onElementOverride(buildSelector(el), styles);
  }, [onElementOverride]);

  // ── RESIZE drag ───────────────────────────────────────────────────────────
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

    const parentHasFixedHeight = parent
      ? (parent as HTMLElement).style.height !== '' || parent.scrollHeight > elRect.height * 1.5
      : false;
    const maxWidth  = parentRect.right  - elRect.left;
    const maxHeight = parentHasFixedHeight ? parentRect.bottom - elRect.top : 99999;

    const siblings: HTMLElement[] = [];
    if (container) {
      const tag = el.tagName.toLowerCase();
      const cls = el.getAttribute('class') || '';
      container.querySelectorAll<HTMLElement>(tag).forEach(s => {
        if (s !== el && (s.getAttribute('class') || '') === cls) siblings.push(s);
      });
    }

    const startMarginTop  = parseFloat(el.style.marginTop)  || 0;
    const startMarginLeft = parseFloat(el.style.marginLeft) || 0;

    dragRef.current = {
      handle,
      startX: e.clientX, startY: e.clientY,
      startWidth: elRect.width, startHeight: elRect.height,
      startRelRect, startMarginTop, startMarginLeft,
      minWidth: 20, minHeight: 20,
      maxWidth, maxHeight,
      el, siblings, parentRect,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { handle, startX, startY, startWidth, startHeight,
              startMarginTop, startMarginLeft,
              minWidth, minHeight, maxWidth, maxHeight, el } = dragRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newW = startWidth, newH = startHeight;
      let newMarginTop = startMarginTop, newMarginLeft = startMarginLeft;

      if (handle === 'e' || handle === 'ne' || handle === 'se')
        newW = Math.max(minWidth, Math.min(startWidth + dx, maxWidth));
      if (handle === 'w' || handle === 'nw' || handle === 'sw') {
        const clampedDx = Math.min(dx, startWidth - minWidth);
        newW = Math.max(minWidth, startWidth - dx);
        newMarginLeft = startMarginLeft + clampedDx;
      }
      if (handle === 's' || handle === 'se' || handle === 'sw')
        newH = Math.max(minHeight, Math.min(startHeight + dy, maxHeight));
      if (handle === 'n' || handle === 'ne' || handle === 'nw') {
        const clampedDy = Math.min(dy, startHeight - minHeight);
        newH = Math.max(minHeight, startHeight - dy);
        newMarginTop = startMarginTop + clampedDy;
      }

      el.style.width      = `${newW}px`;
      el.style.height     = `${newH}px`;
      el.style.marginTop  = newMarginTop  !== 0 ? `${newMarginTop}px`  : '';
      el.style.marginLeft = newMarginLeft !== 0 ? `${newMarginLeft}px` : '';
      el.style.boxSizing  = 'border-box';
      dragRef.current.siblings.forEach(s => {
        s.style.width = `${newW}px`; s.style.height = `${newH}px`;
        s.style.boxSizing = 'border-box';
      });

      const { startRelRect } = dragRef.current;
      const rect: Rect = {
        top:    startRelRect.top  + (newMarginTop  - startMarginTop),
        left:   startRelRect.left + (newMarginLeft - startMarginLeft),
        width:  newW, height: newH,
      };
      updateSelectionDOM(rect);
    };

    const onMouseUp = () => {
      if (dragRef.current && containerRef.current) {
        const { el } = dragRef.current;
        const rect = getRelativeRect(el, containerRef.current);
        setSelected(prev => prev ? { ...prev, rect } : null);
        setOverlayHeight(containerRef.current.scrollHeight);
        emitOverride(el);
      }
      dragRef.current = null;
      didDragRef.current = true;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [containerRef, emitOverride]);

  // ── MOVE drag ─────────────────────────────────────────────────────────────
  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = lastSelectedEl.current as HTMLElement | null;
    if (!el || !containerRef.current) return;

    const { x: startTranslateX, y: startTranslateY } = parseTranslate(el);
    const startRelRect = getRelativeRect(el, containerRef.current);

    moveRef.current = {
      startX: e.clientX, startY: e.clientY,
      startTranslateX, startTranslateY,
      startRelRect, el,
    };

    // Direct DOM cursor — no React re-render
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!moveRef.current) return;

      const clientX = ev.clientX;
      const clientY = ev.clientY;

      // Cancel pending frame — only process latest position per 60fps
      if (moveRafRef.current !== null) cancelAnimationFrame(moveRafRef.current);

      moveRafRef.current = requestAnimationFrame(() => {
        moveRafRef.current = null;
        if (!moveRef.current) return;
        const { startX, startY, startTranslateX, startTranslateY, startRelRect, el } = moveRef.current;
        const dx = clientX - startX;
        const dy = clientY - startY;

        el.style.transform = `translate(${startTranslateX + dx}px, ${startTranslateY + dy}px)`;
        el.setAttribute('data-overridden', '1');

        // Pure delta math — no getBoundingClientRect, no scrollHeight per frame
        updateSelectionDOM({
          top:    startRelRect.top  + dy,
          left:   startRelRect.left + dx,
          width:  startRelRect.width,
          height: startRelRect.height,
        }, true /* skipHeightUpdate */);
      });
    };

    const onMouseUp = () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
      if (moveRef.current && containerRef.current) {
        const { el } = moveRef.current;
        const rect = getRelativeRect(el, containerRef.current);
        setSelected(prev => prev ? { ...prev, rect } : null);
        setOverlayHeight(containerRef.current.scrollHeight);
        emitOverride(el);
      }
      moveRef.current = null;
      didDragRef.current = true;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [containerRef, emitOverride]);

  // ── Shared: update selection border + handles via DOM (no re-render) ───────
  // skipHeightUpdate: true during move — avoids scrollHeight reflow every frame
  function updateSelectionDOM(rect: Rect, skipHeightUpdate = false) {
    if (selectionBorderRef.current) {
      selectionBorderRef.current.style.top    = `${rect.top}px`;
      selectionBorderRef.current.style.left   = `${rect.left}px`;
      selectionBorderRef.current.style.width  = `${rect.width}px`;
      selectionBorderRef.current.style.height = `${rect.height}px`;
    }
    const positions: HandlePos[] = ['nw','n','ne','e','se','s','sw','w'];
    positions.forEach((pos, i) => {
      const hEl = handleElsRef.current[i];
      if (!hEl) return;
      const { top, left } = getHandlePosition(pos, rect);
      hEl.style.top  = `${top}px`;
      hEl.style.left = `${left}px`;
    });
    if (!skipHeightUpdate) {
      const container = containerRef.current;
      if (container && overlayRootRef.current) {
        overlayRootRef.current.style.height = `${container.scrollHeight}px`;
      }
    }
  }

  // ── Mouse events (hover + click to select) ────────────────────────────────
  useEffect(() => {
    if (!editMode) {
      setHovered(null); setSelected(null);
      lastHoveredEl.current = null; lastSelectedEl.current = null;
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
      if (dragRef.current || moveRef.current) return;
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
      if (dragRef.current || moveRef.current) return;
      if (didDragRef.current) { didDragRef.current = false; return; }
      const target = getTarget(e);
      if (!target) return;
      if ((target as HTMLElement).isContentEditable) return;
      if (target.closest('[contenteditable]')) return;

      const el = findTarget(target, container);
      if (!el) { setSelected(null); lastSelectedEl.current = null; return; }

      if (el === lastSelectedEl.current) {
        setSelected(null); lastSelectedEl.current = null; return;
      }

      lastSelectedEl.current = el;
      setSelected({ rect: getRelativeRect(el, container), label: getLabel(el), elType: getElType(el) });
    };

    const handleDocClick = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        setSelected(null); lastSelectedEl.current = null;
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
    <>
      <div
        ref={overlayRootRef}
        data-overlay="true"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: overlayHeight || '100%', pointerEvents: 'none', zIndex: 40, overflow: 'visible' }}
      >
        {/* Hover outline */}
        {hovered && hovered.rect.width > 0 && (() => {
          const c = TYPE_COLORS[hovered.elType];
          return (
            <div style={{
              position: 'absolute',
              top: hovered.rect.top, left: hovered.rect.left,
              width: hovered.rect.width, height: hovered.rect.height,
              background: c.hover, outline: `1px solid ${c.outline}`,
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

        {/* Selected element — Framer-style border + handles */}
        {selected && selected.rect.width > 0 && (() => {
          const { rect, label, elType } = selected;
          const c = TYPE_COLORS[elType];
          const color = c.label;
          return (
            <>
              {/* Draggable selection border (move) */}
              <div
                ref={selectionBorderRef}
                data-overlay="true"
                onMouseDown={handleMoveStart}
                style={{
                  position: 'absolute',
                  top: rect.top, left: rect.left,
                  width: rect.width, height: rect.height,
                  border: `2px solid ${color}`,
                  borderRadius: 2,
                  pointerEvents: 'auto',
                  boxSizing: 'border-box',
                }}
              >
                {/* Element label */}
                <span style={{
                  position: 'absolute', top: -22, left: -2,
                  background: color, color: '#fff',
                  fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                  padding: '2px 6px', borderRadius: '3px 3px 0 0',
                  whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                  {label}
                </span>

              </div>

              {/* Resize handles (8 points) */}
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
    </>
  );
}
