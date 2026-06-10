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
  /** position: relative — used for inline elements where transform is ignored */
  position?: string;
  /** top offset for inline elements (position:relative approach) */
  top?: string;
  /** left offset for inline elements (position:relative approach) */
  left?: string;
  /** @deprecated — kept for backward compat; no longer written for new moves */
  display?: string;
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
  startMarginTop: number;
  startMarginLeft: number;
  /** initial top/left for inline-offset elements */
  startInlineTop: number;
  startInlineLeft: number;
  startRelRect: Rect;
  el: HTMLElement;
  lastClientX: number;
  lastClientY: number;
  /** true when React/Framer already owns el.style.transform — use margin instead */
  useMargin: boolean;
  /** true when element is display:inline — use position:relative top/left instead of transform */
  useInlineOffset: boolean;
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
  const guideHRef         = useRef<HTMLDivElement | null>(null); // horizontal guide line (center snap)
  const guideVRef         = useRef<HTMLDivElement | null>(null); // vertical guide line (center snap)
  const guideHDefaultRef  = useRef<HTMLDivElement | null>(null); // horizontal default position line
  const guideVDefaultRef  = useRef<HTMLDivElement | null>(null); // vertical default position line
  const shadowOutlineRef  = useRef<HTMLDivElement | null>(null); // shadow outline at original position (snap target)

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
      el.style.removeProperty('position');
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('display');
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
          if (styles.position)   el.style.position   = styles.position;
          if (styles.top)        el.style.top        = styles.top;
          if (styles.left)       el.style.left       = styles.left;
          if (styles.transform) {
            // Backward compat: migrate transform overrides to position:relative + left/top
            // for better click/hover hit detection accuracy (ensures selection border
            // matches visual position of element)
            const m = styles.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
            let x = m ? parseFloat(m[1]) : 0;
            let y = m ? parseFloat(m[2]) : 0;

            // SAFETY: Validate offset values to prevent layout breaking
            const MAX_OFFSET = 250;
            const absX = Math.abs(x);
            const absY = Math.abs(y);
            if (absX > MAX_OFFSET || absY > MAX_OFFSET) {
              console.warn(
                `[ElementOverlay] Clamping excessive transform offset for "${className}":\n` +
                `  Original: x=${x}px, y=${y}px\n` +
                `  Max allowed: ${MAX_OFFSET}px\n` +
                `  This prevents layout breaking caused by large position offsets`
              );
              x = Math.sign(x) * Math.min(absX, MAX_OFFSET);
              y = Math.sign(y) * Math.min(absY, MAX_OFFSET);
            }

            el.style.removeProperty('transform');
            el.style.position = 'relative';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
          }
          // Also validate existing position/left/top from saved overrides
          if (styles.left) {
            const leftVal = parseInt(styles.left);
            const MAX_OFFSET = 250;
            if (Math.abs(leftVal) > MAX_OFFSET) {
              console.warn(
                `[ElementOverlay] Clamping excessive left offset for "${className}": ${leftVal}px → ${Math.sign(leftVal) * MAX_OFFSET}px`
              );
              styles.left = `${Math.sign(leftVal) * MAX_OFFSET}px`;
              el.style.left = styles.left;
            } else {
              el.style.left = styles.left;
            }
          }
          if (styles.top) {
            const topVal = parseInt(styles.top);
            const MAX_OFFSET = 250;
            if (Math.abs(topVal) > MAX_OFFSET) {
              console.warn(
                `[ElementOverlay] Clamping excessive top offset for "${className}": ${topVal}px → ${Math.sign(topVal) * MAX_OFFSET}px`
              );
              styles.top = `${Math.sign(topVal) * MAX_OFFSET}px`;
              el.style.top = styles.top;
            } else {
              el.style.top = styles.top;
            }
          }
          el.style.boxSizing = 'border-box';
          el.setAttribute('data-overridden', '1');
        }
      });
    }
  // editMode is included so overrides are re-applied when template components
  // conditionally re-render (e.g. EditSpan vs plain span) on mode switch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, elementOverrides, editMode]);

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
    if (el.style.position)   styles.position   = el.style.position;
    if (el.style.top)        styles.top        = el.style.top;
    if (el.style.left)       styles.left       = el.style.left;
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

    // Only sync siblings if element hasn't been manually overridden
    // Once element is positioned/resized, keep it independent from siblings
    const siblings: HTMLElement[] = [];
    const isOverridden = el.hasAttribute('data-overridden');
    if (container && !isOverridden) {
      const tag = el.tagName.toLowerCase();
      const cls = el.getAttribute('class') || '';
      container.querySelectorAll<HTMLElement>(tag).forEach(s => {
        if (s !== el && (s.getAttribute('class') || '') === cls && !s.hasAttribute('data-overridden')) {
          siblings.push(s);
        }
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

    // Clear hover immediately so no other element highlights during drag
    setHovered(null);
    lastHoveredEl.current = null;

    const { x: startTranslateX, y: startTranslateY } = parseTranslate(el);
    const startMarginTop  = parseFloat(el.style.marginTop)  || 0;
    const startMarginLeft = parseFloat(el.style.marginLeft) || 0;
    const startRelRect = getRelativeRect(el, containerRef.current);

    // Use margin only when the element has a non-translate transform we cannot safely
    // override (e.g. rotate, scale). 'none' and 'translate(...)' are safe to replace.
    const t = el.style.transform;
    const useMargin = t !== '' && t !== 'none' && !t.startsWith('translate(');

    // ── Constrain + snap + axis-lock helpers ─────────────────────────────────
    const parentEl = el.parentElement;
    const parentRelRect: Rect = parentEl && containerRef.current
      ? getRelativeRect(parentEl, containerRef.current)
      : { top: -99999, left: -99999, width: 999999, height: 999999 };

    // For center-snap, walk up to the nearest data-editor-section (full page width).
    // Using the immediate parent gives wrong results when the parent is a narrow
    // flex column — the element would snap to the column center, not the page center.
    let sectionAncestor: Element | null = el.parentElement;
    while (sectionAncestor && !sectionAncestor.getAttribute('data-editor-section')) {
      sectionAncestor = sectionAncestor.parentElement;
    }
    const snapRefEl = sectionAncestor ?? containerRef.current;
    const snapRefRect: Rect = snapRefEl && containerRef.current
      ? getRelativeRect(snapRefEl, containerRef.current)
      : parentRelRect;

    const SNAP         = 8;   // px grid
    const CENTER_SNAP  = 12;  // px radius for center-snap attraction
    const ORIGINAL_SNAP = 30; // px radius for snap-to-original attraction
    const parentCenterX = snapRefRect.left + snapRefRect.width  / 2;
    const parentCenterY = snapRefRect.top  + snapRefRect.height / 2;

    type SnapResult = { dx: number; dy: number; snapV: boolean; snapH: boolean; axisLock: 'h' | 'v' | null; snapOriginal?: boolean };

    // Clamp bounds (shared)
    const minDx = parentRelRect.left - startRelRect.left;
    const maxDx = (parentRelRect.left + parentRelRect.width)  - (startRelRect.left + startRelRect.width);
    const minDy = parentRelRect.top  - startRelRect.top;
    const maxDy = (parentRelRect.top  + parentRelRect.height) - (startRelRect.top  + startRelRect.height);
    const clamp = (v: number, lo: number, hi: number) => hi > lo ? Math.max(lo, Math.min(hi, v)) : v;

    /**
     * LIVE (during drag rAF) — smooth, no grid snap.
     * Axis lock + center snap + constrain only.
     * Grid snap is intentionally omitted to avoid 8px jump jitter during drag.
     */
    const constrainLive = (rawDx: number, rawDy: number, shiftKey: boolean): SnapResult => {
      let effDx = rawDx, effDy = rawDy;
      let axisLock: 'h' | 'v' | null = null;
      if (shiftKey) {
        if (Math.abs(rawDx) >= Math.abs(rawDy)) { effDy = 0; axisLock = 'h'; }
        else                                     { effDx = 0; axisLock = 'v'; }
      }
      let snDx = effDx, snDy = effDy;
      let snapV = false, snapH = false;
      let snapOriginal = false;

      // Check snap-to-original first (strongest snap)
      if (Math.abs(rawDx) < ORIGINAL_SNAP && Math.abs(rawDy) < ORIGINAL_SNAP) {
        snDx = 0;
        snDy = 0;
        snapOriginal = true;
      } else {
        const elCX = startRelRect.left + startRelRect.width  / 2 + effDx;
        const elCY = startRelRect.top  + startRelRect.height / 2 + effDy;
        if (!axisLock || axisLock === 'h') {
          if (Math.abs(elCX - parentCenterX) < CENTER_SNAP) { snDx = parentCenterX - (startRelRect.left + startRelRect.width  / 2); snapV = true; }
        }
        if (!axisLock || axisLock === 'v') {
          if (Math.abs(elCY - parentCenterY) < CENTER_SNAP) { snDy = parentCenterY - (startRelRect.top  + startRelRect.height / 2); snapH = true; }
        }
      }
      return { dx: clamp(snDx, minDx, maxDx), dy: clamp(snDy, minDy, maxDy), snapV, snapH, axisLock, snapOriginal };
    };

    /**
     * FINAL (on mouseUp) — snap to 8px grid + center snap + constrain.
     * Applied once on release so saved position is grid-aligned.
     */
    const constrainFinal = (rawDx: number, rawDy: number): SnapResult => {
      let snDx = rawDx, snDy = rawDy;
      let snapV = false, snapH = false;
      let snapOriginal = false;

      // Check snap-to-original first (strongest snap)
      if (Math.abs(rawDx) < ORIGINAL_SNAP && Math.abs(rawDy) < ORIGINAL_SNAP) {
        snDx = 0;
        snDy = 0;
        snapOriginal = true;
      } else {
        const elCX = startRelRect.left + startRelRect.width  / 2 + rawDx;
        const elCY = startRelRect.top  + startRelRect.height / 2 + rawDy;
        if (Math.abs(elCX - parentCenterX) < CENTER_SNAP) { snDx = parentCenterX - (startRelRect.left + startRelRect.width  / 2); snapV = true; }
        else snDx = Math.round(rawDx / SNAP) * SNAP;
        if (Math.abs(elCY - parentCenterY) < CENTER_SNAP) { snDy = parentCenterY - (startRelRect.top  + startRelRect.height / 2); snapH = true; }
        else snDy = Math.round(rawDy / SNAP) * SNAP;
      }
      return { dx: clamp(snDx, minDx, maxDx), dy: clamp(snDy, minDy, maxDy), snapV, snapH, axisLock: null, snapOriginal };
    };

    /** Update guide line DOM positions + visibility — zero re-renders */
    const updateGuides = (dx: number, dy: number, snapV: boolean, snapH: boolean, axisLock: 'h' | 'v' | null) => {
      const ACTIVE   = '#06b6d4';          // bright cyan (center snap)
      const INACTIVE = 'rgba(6,182,212,0.35)'; // dim cyan (center snap)
      const DEFAULT  = 'rgba(100,116,139,0.4)'; // gray (default position)

      // ── Center snap guides ────────────────────────────────────────────────
      if (guideHRef.current) {
        const y = axisLock === 'h'
          ? startRelRect.top + startRelRect.height / 2 + dy
          : parentCenterY;
        guideHRef.current.style.top    = `${y}px`;
        guideHRef.current.style.left   = `${snapRefRect.left}px`;
        guideHRef.current.style.width  = `${snapRefRect.width}px`;
        guideHRef.current.style.borderTopColor = (snapH || axisLock === 'h') ? ACTIVE : INACTIVE;
        guideHRef.current.style.opacity = '1';
        guideHRef.current.style.display = 'block';
      }
      if (guideVRef.current) {
        const x = axisLock === 'v'
          ? startRelRect.left + startRelRect.width / 2 + dx
          : parentCenterX;
        guideVRef.current.style.left   = `${x}px`;
        guideVRef.current.style.top    = `${snapRefRect.top}px`;
        guideVRef.current.style.height = `${snapRefRect.height}px`;
        guideVRef.current.style.borderLeftColor = (snapV || axisLock === 'v') ? ACTIVE : INACTIVE;
        guideVRef.current.style.opacity = '1';
        guideVRef.current.style.display = 'block';
      }

      // ── Default position guides (untuk reset ke posisi awal) ─────────────
      if (guideHDefaultRef.current) {
        const defaultY = startRelRect.top + startRelRect.height / 2;
        guideHDefaultRef.current.style.top    = `${defaultY}px`;
        guideHDefaultRef.current.style.left   = `${snapRefRect.left}px`;
        guideHDefaultRef.current.style.width  = `${snapRefRect.width}px`;
        guideHDefaultRef.current.style.borderTopColor = DEFAULT;
        guideHDefaultRef.current.style.opacity = '0.6';
        guideHDefaultRef.current.style.display = 'block';
      }
      if (guideVDefaultRef.current) {
        const defaultX = startRelRect.left + startRelRect.width / 2;
        guideVDefaultRef.current.style.left   = `${defaultX}px`;
        guideVDefaultRef.current.style.top    = `${snapRefRect.top}px`;
        guideVDefaultRef.current.style.height = `${snapRefRect.height}px`;
        guideVDefaultRef.current.style.borderLeftColor = DEFAULT;
        guideVDefaultRef.current.style.opacity = '0.6';
        guideVDefaultRef.current.style.display = 'block';
      }

      // ── Shadow outline at original position (snap target) ────────────────────
      if (shadowOutlineRef.current) {
        shadowOutlineRef.current.style.top    = `${startRelRect.top}px`;
        shadowOutlineRef.current.style.left   = `${startRelRect.left}px`;
        shadowOutlineRef.current.style.width  = `${startRelRect.width}px`;
        shadowOutlineRef.current.style.height = `${startRelRect.height}px`;
        // Highlight shadow when snap-to-original is active (close to original position)
        shadowOutlineRef.current.style.backgroundColor = (dx === 0 && dy === 0) ? 'rgba(59,130,246,0.20)' : 'rgba(59,130,246,0.12)';
        shadowOutlineRef.current.style.display = 'block';
      }
    };
    const hideGuides = () => {
      if (guideHRef.current) guideHRef.current.style.display = 'none';
      if (guideVRef.current) guideVRef.current.style.display = 'none';
      if (guideHDefaultRef.current) guideHDefaultRef.current.style.display = 'none';
      if (guideVDefaultRef.current) guideVDefaultRef.current.style.display = 'none';
      if (shadowOutlineRef.current) shadowOutlineRef.current.style.display = 'none';
    };
    // ─────────────────────────────────────────────────────────────────────────

    // For display:inline elements, transform is ignored by CSS spec.
    // Use position:relative + top/left instead — works on inline without changing display.
    // This survives React re-renders since React doesn't manage position/top/left here.
    const computedDisplay = window.getComputedStyle(el).display;
    const useInlineOffset = !useMargin && computedDisplay === 'inline';
    const startInlineTop  = useInlineOffset ? (parseFloat(el.style.top)  || 0) : 0;
    const startInlineLeft = useInlineOffset ? (parseFloat(el.style.left) || 0) : 0;

    let lastCachedRect = startRelRect;
    let lastCachedTime = 0;
    const RECT_CACHE_MS = 16; // ~1 frame at 60fps

    moveRef.current = {
      startX: e.clientX, startY: e.clientY,
      startTranslateX, startTranslateY,
      startMarginTop, startMarginLeft,
      startInlineTop, startInlineLeft,
      startRelRect, el,
      lastClientX: e.clientX, lastClientY: e.clientY,
      useMargin, useInlineOffset,
    };

    // Direct DOM cursor — no React re-render
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    // Promote element to compositor layer + disable any CSS transition during drag
    const savedTransition = el.style.transition;
    el.style.transition = 'none';
    el.style.willChange = useInlineOffset ? 'top, left' : 'transform';

    const applyPosition = (el: HTMLElement, dx: number, dy: number, state: MoveState) => {
      // ALWAYS prefer position:relative + left/top for click/hover hit detection accuracy
      // This works for both inline and block elements and ensures selection border
      // matches the actual visual position of the element (important for UX)
      const shouldUsePositioning = !state.useMargin;

      if (shouldUsePositioning) {
        // Use position:relative + left/top for reliable hit detection
        el.style.position = 'relative';
        el.style.left = `${state.startInlineLeft + dx}px`;
        el.style.top  = `${state.startInlineTop  + dy}px`;
        // Clear transform if any
        el.style.transform = '';
      } else {
        // Use margin only for elements with complex transforms we can't safely override
        el.style.marginLeft = `${state.startMarginLeft + dx}px`;
        el.style.marginTop  = `${state.startMarginTop  + dy}px`;
      }
      el.setAttribute('data-overridden', '1');
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!moveRef.current) return;

      const clientX  = ev.clientX;
      const clientY  = ev.clientY;
      const shiftKey = ev.shiftKey;

      // Always track latest position so onMouseUp can apply final position
      moveRef.current.lastClientX = clientX;
      moveRef.current.lastClientY = clientY;

      // Cancel pending frame — only process latest position per 60fps
      if (moveRafRef.current !== null) cancelAnimationFrame(moveRafRef.current);

      moveRafRef.current = requestAnimationFrame(() => {
        moveRafRef.current = null;
        if (!moveRef.current) return;
        const { startX, startY, startRelRect, el } = moveRef.current;
        const { dx, dy, snapV, snapH, axisLock } = constrainLive(clientX - startX, clientY - startY, shiftKey);

        applyPosition(el, dx, dy, moveRef.current);
        updateGuides(dx, dy, snapV, snapH, axisLock);

        // Smart rect caching: refresh actual rect every ~16ms (1 frame), use cached value otherwise
        // This balances smooth motion with accurate selection border alignment
        const now = performance.now();
        if (now - lastCachedTime > RECT_CACHE_MS) {
          lastCachedRect = getRelativeRect(el, containerRef.current);
          lastCachedTime = now;
        }

        updateSelectionDOM({
          top:    lastCachedRect.top,
          left:   lastCachedRect.left,
          width:  lastCachedRect.width,
          height: lastCachedRect.height,
        }, true /* skipHeightUpdate */);
      });
    };

    const onMouseUp = () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
      if (moveRef.current && containerRef.current) {
        const { el, startX, startY, lastClientX, lastClientY } = moveRef.current;

        // Apply final position synchronously — rAF may have been cancelled
        // constrainFinal: grid snap applied once on release (not during drag)
        let { dx, dy, snapV, snapH } = constrainFinal(lastClientX - startX, lastClientY - startY);

        // ── SAFETY: Validate offset values to prevent layout breaking ──────────
        // Prevent excessive offsets that would shift layout beyond container bounds
        const MAX_OFFSET = 250; // Maximum reasonable offset in pixels
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > MAX_OFFSET || absDy > MAX_OFFSET) {
          const clampedDx = Math.sign(dx) * Math.min(absDx, MAX_OFFSET);
          const clampedDy = Math.sign(dy) * Math.min(absDy, MAX_OFFSET);
          console.warn(
            `[ElementOverlay] Position offset clamped for "${getLabel(el)}":\n` +
            `  Original: dx=${dx}px, dy=${dy}px\n` +
            `  Clamped:  dx=${clampedDx}px, dy=${clampedDy}px\n` +
            `  Reason: Offset exceeded MAX_OFFSET (${MAX_OFFSET}px) to prevent layout breaking`
          );
          dx = clampedDx;
          dy = clampedDy;
        }

        applyPosition(el, dx, dy, moveRef.current);

        // ── Apply centering style when snapped to center ──────────────────────
        // snapV = horizontal center snap, snapH = vertical center snap
        if (snapV) {
          // Horizontal center: apply margin centering
          el.style.marginLeft = 'auto';
          el.style.marginRight = 'auto';
          // Clear transform X component if needed
          const t = el.style.transform || '';
          if (t.startsWith('translate(')) {
            const m = t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
            if (m) {
              const translateY = parseFloat(m[2]);
              el.style.transform = translateY !== 0 ? `translate(0px, ${translateY}px)` : 'none';
            }
          }
        }
        if (snapH) {
          // Vertical center: apply margin centering (if parent has flex/grid)
          // For vertical centering with margins, typically need flex parent
          // For now just set margin-top/bottom: auto
          el.style.marginTop = 'auto';
          el.style.marginBottom = 'auto';
          // Clear transform Y component if needed
          const t = el.style.transform || '';
          if (t.startsWith('translate(')) {
            const m = t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
            if (m) {
              const translateX = parseFloat(m[1]);
              el.style.transform = translateX !== 0 ? `translate(${translateX}px, 0px)` : 'none';
            }
          }
        }

        const rect = getRelativeRect(el, containerRef.current);
        setSelected(prev => prev ? { ...prev, rect } : null);
        setOverlayHeight(containerRef.current.scrollHeight);
        emitOverride(el);
      }
      hideGuides();
      // Restore transition + remove compositor hint
      el.style.transition = savedTransition;
      el.style.willChange = '';
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
      // Prevent selection change if any mouse button is still held
      if (e.buttons !== 0) return;
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
              {/* Visual selection border (pointerEvents: none to allow child interaction) */}
              <div
                ref={selectionBorderRef}
                data-overlay="true"
                style={{
                  position: 'absolute',
                  top: rect.top, left: rect.left,
                  width: rect.width, height: rect.height,
                  border: `2px solid ${color}`,
                  borderRadius: 2,
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {/* Invisible drag-capture overlay (only on top border for easier dragging) */}
              <div
                data-overlay="true"
                onMouseDown={handleMoveStart}
                style={{
                  position: 'absolute',
                  top: rect.top - 8, left: rect.left,
                  width: rect.width, height: 16,
                  pointerEvents: 'auto',
                  cursor: 'grab',
                  zIndex: 42,
                }}
              />
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

        {/* ── Guide lines (shown during move drag) ─────────────────────── */}
        {/* Horizontal guide — sits at a Y position */}
        {/* Center snap guides */}
        <div ref={guideHRef} style={{
          display: 'none', position: 'absolute', height: 0,
          borderTop: '1px dashed rgba(6,182,212,0.35)',
          pointerEvents: 'none', zIndex: 50,
        }} />
        <div ref={guideVRef} style={{
          display: 'none', position: 'absolute', width: 0,
          borderLeft: '1px dashed rgba(6,182,212,0.35)',
          pointerEvents: 'none', zIndex: 50,
        }} />

        {/* Default position guides — help user reset to original position */}
        <div ref={guideHDefaultRef} style={{
          display: 'none', position: 'absolute', height: 0,
          borderTop: '1px dashed rgba(100,116,139,0.4)',
          pointerEvents: 'none', zIndex: 49,
        }} />
        <div ref={guideVDefaultRef} style={{
          display: 'none', position: 'absolute', width: 0,
          borderLeft: '1px dashed rgba(100,116,139,0.4)',
          pointerEvents: 'none', zIndex: 49,
        }} />

        {/* Shadow outline at original position — snap target for drag-to-reset */}
        <div ref={shadowOutlineRef} style={{
          display: 'none', position: 'absolute',
          pointerEvents: 'none', zIndex: 48,
          transition: 'background-color 0.15s',
        }} />
      </div>
    </>
  );
}
