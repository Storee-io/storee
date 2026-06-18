'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Eraser, Link, Link2Off, ChevronDown,
} from 'lucide-react';

interface Props {
  editMode: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  primaryColor?: string;
}

type FmtKey = 'bold' | 'italic' | 'underline' | 'strikeThrough';

const INLINE: { cmd: FmtKey; Icon: React.ElementType; label: string }[] = [
  { cmd: 'bold',          Icon: Bold,          label: 'Bold (Ctrl+B)' },
  { cmd: 'italic',        Icon: Italic,        label: 'Italic (Ctrl+I)' },
  { cmd: 'underline',     Icon: Underline,     label: 'Underline (Ctrl+U)' },
  { cmd: 'strikeThrough', Icon: Strikethrough, label: 'Strikethrough' },
];

const ALIGN: { cmd: string; Icon: React.ElementType; label: string }[] = [
  { cmd: 'justifyLeft',   Icon: AlignLeft,   label: 'Align left' },
  { cmd: 'justifyCenter', Icon: AlignCenter, label: 'Center' },
  { cmd: 'justifyRight',  Icon: AlignRight,  label: 'Align right' },
];

const TEXT_STYLES = [
  { label: 'Normal',    tag: 'p' },
  { label: 'Heading 1', tag: 'h1' },
  { label: 'Heading 2', tag: 'h2' },
  { label: 'Heading 3', tag: 'h3' },
  { label: 'Heading 4', tag: 'h4' },
];

const FONT_FAMILIES = [
  { label: 'Default',         value: '' },
  { label: 'Inter',           value: 'Inter, sans-serif' },
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New',     value: '"Courier New", monospace' },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS',    value: '"Trebuchet MS", sans-serif' },
];

const FONT_SIZES = [8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

const LINE_HEIGHTS = [
  { label: '1.0', value: '1' },
  { label: '1.2', value: '1.2' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
];

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0" />;
}

interface DropdownOption { label: string; value: string }

/**
 * Custom dropdown that NEVER steals the contentEditable text selection.
 * Every interactive element uses onMouseDown + preventDefault (the same trick
 * the Bold/Italic buttons rely on), so the editor keeps focus and the selection
 * survives — unlike a native <select>, whose dropdown re-render closes mid-pick
 * and drops the selection.
 */
function ToolbarDropdown({
  title, value, options, onOpen, onSelect, width = 'auto', menuWidth = 120, align = 'left',
}: {
  title: string;
  value: string;
  options: DropdownOption[];
  onOpen: () => void;
  onSelect: (value: string) => void;
  width?: string;
  menuWidth?: number;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const current = options.find(o => o.value === value);
  const label = current ? current.label : '—';

  return (
    <div ref={ref} className="relative" title={title} style={{ minWidth: width }}>
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); onOpen(); setOpen(o => !o); }}
        className="flex items-center gap-0.5 text-xs text-slate-600 hover:bg-slate-100 rounded px-1.5 py-1 whitespace-nowrap"
      >
        <span className="truncate" style={{ maxWidth: width === 'auto' ? undefined : width }}>{label}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div
          className="absolute z-[60] mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
          style={{ top: '100%', [align]: 0, width: menuWidth }}
          onMouseDown={e => e.preventDefault()}
        >
          {options.map(o => (
            <button
              key={o.value || '__default__'}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                onSelect(o.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 ${
                o.value === value ? 'text-emerald-600 font-semibold bg-emerald-50' : 'text-slate-700'
              }`}
              style={{ fontFamily: o.value && o.value.includes(',') ? o.value : undefined }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FloatingToolbar({ editMode, containerRef, primaryColor = '#10b981' }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const [fmt, setFmt] = useState<Record<FmtKey, boolean>>({
    bold: false, italic: false, underline: false, strikeThrough: false,
  });
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [currentFontFamily, setCurrentFontFamily] = useState('');
  const [currentLineHeight, setCurrentLineHeight] = useState('');
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [currentHighlightColor, setCurrentHighlightColor] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState(''); // Store selected text when link dialog opens
  const [isSelectedTextLink, setIsSelectedTextLink] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const savedEditorRef = useRef<HTMLElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      // Also save which contentEditable had focus so we can restore it
      const active = document.activeElement as HTMLElement;
      if (active?.isContentEditable) {
        savedEditorRef.current = active;
      }
    }
  }, []);

  const restoreRange = useCallback(() => {
    const range = savedRangeRef.current;
    if (!range) return;
    // Focus the editor first so the selection lands in the right context
    if (savedEditorRef.current && document.activeElement !== savedEditorRef.current) {
      savedEditorRef.current.focus();
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);

  const checkIfSelectedTextIsLink = useCallback((): { isLink: boolean; linkElement: HTMLAnchorElement | null } => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return { isLink: false, linkElement: null };

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);

    // Check if element is or is inside an <a> tag. During editing the EditSpan strips
    // `href` into `data-href` (so links can't navigate), so match both forms.
    const linkElement = el?.closest('a[href], a[data-href]') as HTMLAnchorElement | null;
    return { isLink: !!linkElement, linkElement };
  }, []);

  const removeLink = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    const linkElement = el?.closest('a[href], a[data-href]') as HTMLAnchorElement | null;

    if (linkElement) {
      // Replace link element with its text content
      const textNode = document.createTextNode(linkElement.textContent ?? '');
      linkElement.parentNode?.replaceChild(textNode, linkElement);

      // Restore selection to the text node
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(textNode);
      sel.addRange(newRange);

      setIsSelectedTextLink(false);
    }
  }, []);

  const updateCurrentColors = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setCurrentTextColor('#000000');
      setCurrentHighlightColor('');
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (!el) {
      setCurrentTextColor('#000000');
      setCurrentHighlightColor('');
      return;
    }

    // Get computed styles
    const elForStyle = (el.nodeType === Node.ELEMENT_NODE ? el : el.parentElement) as HTMLElement | null;
    if (elForStyle) {
      const computedStyle = window.getComputedStyle(elForStyle);

      // Extract text color
      let textColor = '#000000';
      const colorValue = computedStyle.color;
      if (colorValue) {
        // Convert rgb(r, g, b) to hex
        const match = colorValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1]).toString(16).padStart(2, '0');
          const g = parseInt(match[2]).toString(16).padStart(2, '0');
          const b = parseInt(match[3]).toString(16).padStart(2, '0');
          textColor = `#${r}${g}${b}`;
        }
      }

      // Check for inline style color or font tag
      let walk: HTMLElement | null = elForStyle;
      while (walk) {
        const inlineColor = walk.style?.color;
        if (inlineColor) {
          const match = inlineColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            textColor = `#${r}${g}${b}`;
            break;
          }
        }
        const fontTag = walk.closest('font[color]') as HTMLFontElement | null;
        if (fontTag?.color) {
          textColor = fontTag.color.startsWith('#') ? fontTag.color : `#${fontTag.color}`;
          break;
        }
        if (walk.hasAttribute?.('data-editor-field')) break;
        walk = walk.parentElement;
      }

      setCurrentTextColor(textColor);

      // Extract background/highlight color
      let highlightColor = '';
      const bgColorValue = computedStyle.backgroundColor;
      if (bgColorValue && bgColorValue !== 'rgba(0, 0, 0, 0)') {
        const match = bgColorValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1]).toString(16).padStart(2, '0');
          const g = parseInt(match[2]).toString(16).padStart(2, '0');
          const b = parseInt(match[3]).toString(16).padStart(2, '0');
          highlightColor = `#${r}${g}${b}`;
        }
      }

      setCurrentHighlightColor(highlightColor);
    }
  }, []);

  const updateCurrentFontSize = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setCurrentFontSize('16');
      setCurrentFontFamily('');
      setCurrentLineHeight('');
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;

    // Get the element - could be the container itself or the parent of a text node
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (!el) {
      setCurrentFontSize('16');
      setCurrentFontFamily('');
      setCurrentLineHeight('');
      return;
    }

    // --- Detect current font family (from computed style, mapped to an option) ---
    const elForStyle = (el.nodeType === Node.ELEMENT_NODE ? el : el.parentElement) as HTMLElement | null;
    if (elForStyle) {
      const computedFam = window.getComputedStyle(elForStyle).fontFamily.toLowerCase();
      const matchedFam = FONT_FAMILIES.find(f => {
        if (!f.value) return false;
        const first = f.value.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
        return computedFam.includes(first);
      });
      setCurrentFontFamily(matchedFam ? matchedFam.value : '');

      // --- Detect current line height (explicit inline value only; ignore the
      // technical line-height:1 injected by the font-size handler) ---
      let lhFound = '';
      let walk: HTMLElement | null = elForStyle;
      while (walk && !lhFound) {
        const inlineLh = walk.style?.lineHeight;
        if (inlineLh && inlineLh !== '1' && inlineLh !== 'normal') {
          lhFound = String(parseFloat(inlineLh));
        }
        if (walk.hasAttribute?.('data-editor-field')) break;
        walk = walk.parentElement;
      }
      setCurrentLineHeight(LINE_HEIGHTS.some(l => l.value === lhFound) ? lhFound : '');
    }

    // Walk every text node inside the selection and collect distinct computed font sizes.
    // Using computed style (not just inline style) handles inherited sizes correctly.
    const selRange = sel.getRangeAt(0);
    const fontSizes = new Set<string>();

    const walker = document.createTreeWalker(
      selRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? selRange.commonAncestorContainer.parentElement!
        : (selRange.commonAncestorContainer as HTMLElement),
      NodeFilter.SHOW_TEXT,
      null
    );

    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      // Skip text nodes outside the selection range
      if (!selRange.intersectsNode(textNode)) continue;
      const parent = textNode.parentElement;
      if (!parent) continue;
      const px = window.getComputedStyle(parent).fontSize;
      const m = px.match(/^(\d+(?:\.\d+)?)/);
      if (m) fontSizes.add(String(Math.round(parseFloat(m[1]))));
    }

    // If the range covers a single element with no text children, fall back to that element
    if (fontSizes.size === 0) {
      const px = window.getComputedStyle(el as HTMLElement).fontSize;
      const m = px.match(/^(\d+(?:\.\d+)?)/);
      if (m) fontSizes.add(String(Math.round(parseFloat(m[1]))));
    }

    if (fontSizes.size === 1) {
      const size = Array.from(fontSizes)[0];
      setCurrentFontSize(FONT_SIZES.includes(Number(size)) ? size : '');
    } else if (fontSizes.size > 1) {
      // Multiple different sizes — show mixed indicator
      setCurrentFontSize('');
    } else {
      setCurrentFontSize('16');
    }
  }, []);

  const refresh = useCallback(() => {
    // Don't update pos when link input is active - preserve toolbar position
    if (showLink) {
      return;
    }

    if (!editMode) { setPos(null); return; }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !sel.toString().trim()) {
      setPos(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setPos(null);
      return;
    }

    const node = range.commonAncestorContainer;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    if (!el?.closest('[data-editor-field]')) {
      setPos(null);
      return;
    }

    // Only show toolbar if the contentEditable element is currently focused
    const activeEl = document.activeElement as HTMLElement;
    if (!activeEl?.isContentEditable || !el.closest('[data-editor-field]')?.contains(activeEl)) {
      setPos(null);
      return;
    }

    const r = range.getBoundingClientRect();
    const toolbarH = 44;
    const gap = 28;
    const centerX = r.left + r.width / 2;

    // Get actual toolbar width from DOM if available, else estimate
    const toolbarW = toolbarRef.current?.offsetWidth || 600;
    const minMargin = Math.max(16, (toolbarW + 32) / 2);

    // If there's not enough room above, flip toolbar to below the selection
    const spaceAbove = r.top;
    const below = spaceAbove < toolbarH + gap + 16;

    setPos({
      top: below ? r.bottom + gap : r.top - toolbarH - gap,
      left: Math.max(minMargin, Math.min(centerX, window.innerWidth - minMargin)),
      below,
    });

    setFmt({
      bold:          document.queryCommandState('bold'),
      italic:        document.queryCommandState('italic'),
      underline:     document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    });

    // Check if selected text is a link
    const { isLink } = checkIfSelectedTextIsLink();
    setIsSelectedTextLink(isLink);

    updateCurrentFontSize();
    updateCurrentColors();
  }, [editMode, containerRef, updateCurrentFontSize, updateCurrentColors, showLink, checkIfSelectedTextIsLink]);

  useEffect(() => {
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, [refresh]);

  // Refresh toolbar position on container scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      refresh();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [refresh, containerRef]);

  useEffect(() => { if (!editMode) setPos(null); }, [editMode]);

  // Explicitly focus link input when link mode is activated
  useEffect(() => {
    if (showLink && linkInputRef.current) {
      setTimeout(() => {
        if (linkInputRef.current) {
          linkInputRef.current.focus();
          linkInputRef.current.select();
        }
      }, 0);
    }
  }, [showLink]);

  const exec = useCallback((cmd: string, value?: string) => {
    try {
      restoreRange();
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;

      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
      const editorField = el?.closest('[data-editor-field]') as HTMLElement;

      if (!editorField) return;

      // Ensure field has focus and selection is restored
      editorField.focus();

      // Restore selection again after focus
      sel.removeAllRanges();
      sel.addRange(range);

      // Execute command
      document.execCommand(cmd, false, value);
    } catch (err) {
      console.error(`Error in exec(${cmd}):`, err);
    }
    setTimeout(refresh, 0);
  }, [refresh, restoreRange]);

  const handleFontSize = useCallback((size: number) => {
    restoreRange();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    const editorField = el?.closest('[data-editor-field]') as HTMLElement;

    if (!editorField) {
      return;
    }

    // Flatten any existing font-size spans inside a node (remove nesting)
    const flattenFontSizeSpans = (node: HTMLElement) => {
      const inner = Array.from(node.querySelectorAll('span[style*="font-size"]'));
      // Process deepest first so parent removals don't affect children
      for (let i = inner.length - 1; i >= 0; i--) {
        const s = inner[i];
        if (!node.contains(s)) continue;
        const parent = s.parentNode;
        if (!parent) continue;
        while (s.firstChild) parent.insertBefore(s.firstChild, s);
        parent.removeChild(s);
      }
    };

    try {
      editorField.focus();

      // First, clean up ALL old font-size spans in the field to prevent alignment issues
      flattenFontSizeSpans(editorField);

      sel.removeAllRanges();
      sel.addRange(range);

      // Extract selected content and wrap in new font-size span
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.style.lineHeight = '1'; // Ensure line-height doesn't shrink parent element

      try {
        // Try to wrap existing selection
        range.surroundContents(span);
      } catch {
        // Selection crosses element boundaries — extract content and re-insert
        const contents = range.extractContents();

        // Clear the span and add only plain text to remove any nested font-size spans
        span.textContent = contents.textContent || '';

        // Re-add any important nested elements (links, etc) but not font-size spans
        // by copying non-font-size elements
        const walker = document.createTreeWalker(
          contents,
          NodeFilter.SHOW_ELEMENT,
          null
        );
        let node;
        const elementsToKeep: Element[] = [];
        while (node = walker.nextNode()) {
          if (node instanceof HTMLElement && !node.style.fontSize && node.tagName === 'A') {
            elementsToKeep.push(node.cloneNode(true) as Element);
          }
        }

        // If we have elements to keep (like links), rebuild with them
        if (elementsToKeep.length > 0) {
          span.innerHTML = '';
          elementsToKeep.forEach(el => span.appendChild(el));
        }

        range.insertNode(span);
      }

      // Remove any nested font-size spans so we don't end up with stacked wrappers
      flattenFontSizeSpans(span);
    } catch (err) {
      console.error('Font size error:', err);
    }

    setTimeout(refresh, 0);
  }, [restoreRange, refresh]);

  const handleFontFamily = useCallback((family: string) => {
    restoreRange();
    if (family) exec('fontName', family);
  }, [restoreRange, exec]);

  const handleLineHeight = useCallback((lh: string) => {
    restoreRange();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    const editorField = el?.closest('[data-editor-field]') as HTMLElement;

    if (!editorField) {
      return;
    }

    try {
      editorField.focus();

      sel.removeAllRanges();
      sel.addRange(range);

      const span = document.createElement('span');
      span.style.lineHeight = lh;

      try {
        range.surroundContents(span);
      } catch (e) {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
    } catch (err) {
      console.error('Line height error:', err);
    }

    setTimeout(refresh, 0);
  }, [restoreRange, refresh]);

  const handleTextStyle = useCallback((tag: string) => {
    restoreRange();
    if (tag) {
      exec('formatBlock', `<${tag}>`);
    }
  }, [restoreRange, exec]);

  const handleLink = useCallback(() => {
    try {
      const { isLink } = checkIfSelectedTextIsLink();

      if (isLink) {
        removeLink();
        // Trigger blur to save changes
        const sel = window.getSelection();
        const range = sel?.getRangeAt(0);
        if (range) {
          const container = range.commonAncestorContainer;
          const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
          const editorField = el?.closest('[data-editor-field]') as HTMLElement;
          if (editorField) {
            setTimeout(() => {
              editorField.blur();
              setTimeout(() => editorField.focus(), 0);
            }, 0);
          }
        }
      } else {
        // Open link input dialog if text is not a link
        const sel = window.getSelection();
        const selectedText = sel?.toString() || '';
        saveRange();
        setLinkText(selectedText);
        setLinkUrl('');
        setShowLink(true);
      }
    } catch (err) {
      console.error('[FloatingToolbar] Error in handleLink:', err);
    }
  }, [saveRange, checkIfSelectedTextIsLink, removeLink]);

  // Cancel link input and restore focus + selection to editor field
  const cancelLink = useCallback(() => {
    setShowLink(false);
    const range = savedRangeRef.current;
    if (range) {
      const container = range.commonAncestorContainer;
      const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
      const editorField = el?.closest('[data-editor-field]') as HTMLElement | null;
      if (editorField) {
        editorField.focus();
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        setTimeout(() => refresh(), 0);
      }
    }
  }, [refresh]);

  const applyLink = useCallback(() => {
    try {
      const url = linkUrl.trim();
      if (!url || !linkText) {
        setShowLink(false);
        setLinkText('');
        return;
      }

      const editor = savedEditorRef.current;
      if (!editor) {
        setShowLink(false);
        setLinkText('');
        return;
      }

      const fullUrl = url.startsWith('http') ? url : `https://${url}`;

      // Resolve the target range. Prefer the selection saved when the dialog opened
      // (edit mode is kept alive, so it's still valid); otherwise locate linkText.
      // NOTE: the editor's selection can't be relied on here (focus was on the dialog
      // input), so we operate on the Range/DOM directly rather than via execCommand.
      let range: Range | null = null;
      const saved = savedRangeRef.current;
      if (
        saved &&
        editor.contains(saved.startContainer) &&
        editor.contains(saved.endContainer) &&
        saved.toString().length > 0
      ) {
        range = saved;
      } else if (linkText) {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        const lower = linkText.toLowerCase();
        while ((node = walker.nextNode())) {
          const idx = (node.textContent ?? '').toLowerCase().indexOf(lower);
          if (idx >= 0) {
            range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + linkText.length);
            break;
          }
        }
      }
      if (!range) { setShowLink(false); setLinkText(''); return; }

      // Record the plain-text offset of the selection within the editor. Unwrapping
      // (below) changes tags but not text, so we can re-locate the exact span after.
      const charOffsetOf = (container: Node, offset: number): number => {
        let count = 0;
        const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
        let n: Node | null;
        while ((n = w.nextNode())) {
          if (n === container) return count + offset;
          count += (n.textContent ?? '').length;
        }
        return count + offset;
      };
      const startChar = charOffsetOf(range.startContainer, range.startOffset);
      const len = range.toString().length || linkText.length;

      // Remove any existing links that overlap the selection FIRST. Wrapping a range
      // that sits inside an <a> would otherwise nest anchors (<a><a>…</a></a>); the
      // browser then mangles the invalid markup and the link "disappears". Unwrapping
      // makes the text flat so the new link is a clean, single, non-nested anchor.
      [...editor.querySelectorAll('a')]
        .filter((a) => range!.intersectsNode(a))
        .forEach((a) => {
          const p = a.parentNode;
          if (!p) return;
          while (a.firstChild) p.insertBefore(a.firstChild, a);
          p.removeChild(a);
        });
      editor.normalize();

      // Re-locate the recorded span in the now-flat text and wrap it in a fresh anchor.
      const findAt = (target: number): { node: Text; offset: number } | null => {
        let count = 0;
        const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
        let n: Node | null;
        while ((n = w.nextNode())) {
          const l = (n.textContent ?? '').length;
          if (count + l >= target) return { node: n as Text, offset: target - count };
          count += l;
        }
        return null;
      };
      const startPos = findAt(startChar);
      const endPos = findAt(startChar + len);
      if (!startPos || !endPos) { setShowLink(false); setLinkText(''); return; }

      const wrapRange = document.createRange();
      wrapRange.setStart(startPos.node, startPos.offset);
      wrapRange.setEnd(endPos.node, endPos.offset);
      const frag = wrapRange.extractContents();
      // Defensive: drop any stray anchors inside the fragment so we never nest.
      frag.querySelectorAll?.('a').forEach((a) => {
        const p = a.parentNode;
        if (!p) return;
        while (a.firstChild) p.insertBefore(a.firstChild, a);
        p.removeChild(a);
      });
      const anchor = document.createElement('a');
      // Use data-href while editing so the link can't navigate; commitEdit's
      // restoreLinkHrefs converts it back to a real href when the edit is saved.
      anchor.setAttribute('data-href', fullUrl);
      anchor.style.color = primaryColor;
      anchor.style.textDecoration = 'underline';
      anchor.appendChild(frag);
      wrapRange.insertNode(anchor);

      setShowLink(false);
      setLinkText('');

      // Persist to React state via the owning EditSpan (commit-field listener). The
      // editor isn't reliably blur-committed here, so a manual DOM change would be lost
      // on the next render without this.
      const fld = editor.getAttribute('data-editor-field');
      if (fld) {
        window.dispatchEvent(new CustomEvent('storee:commit-field', { detail: { field: fld, html: editor.innerHTML } }));
      }
    } catch (err) {
      console.error('[FloatingToolbar] Error in applyLink:', err);
      setShowLink(false);
      setLinkText('');
    }
  }, [linkUrl, linkText, primaryColor]);

  if (!pos) return null;

  const active = (on: boolean) =>
    `p-1.5 rounded-lg transition-all ${on ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  const plain = 'p-1.5 rounded-lg transition-all text-slate-600 hover:bg-slate-100';

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    transform: 'translateX(-50%)',
    zIndex: 9999,
  };

  // Small arrow pointing toward the selected text
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    ...(pos.below
      ? { top: -5, borderBottom: '5px solid #e2e8f0' }   // arrow up (toolbar is below text)
      : { bottom: -5, borderTop: '5px solid #e2e8f0' }   // arrow down (toolbar is above text)
    ),
  };

  // Link input mode
  if (showLink) {
    return (
      <div
        ref={toolbarRef}
        data-floating-toolbar="1"
        style={baseStyle}
        className="relative flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl shadow-lg px-2.5 py-1.5 select-none"
      >
        <div style={arrowStyle} />
        <Link className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          autoFocus
          ref={linkInputRef}
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              applyLink();
              e.preventDefault();
            }
            if (e.key === 'Escape') {
              cancelLink();
              e.preventDefault();
            }
          }}
          placeholder="https://..."
          className="text-sm outline-none border-none w-48 text-slate-700 placeholder:text-slate-300 bg-transparent"
          style={{ display: 'block', visibility: 'visible' }}
        />
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyLink()}
          className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 px-1"
        >
          Apply
        </button>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={cancelLink}
          className="text-xs text-slate-400 hover:text-slate-600 px-1"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      data-floating-toolbar="1"
      onMouseDown={e => {
        // Don't prevent default for select elements (they need mousedown to open dropdown)
        if ((e.target as HTMLElement).tagName !== 'SELECT') {
          e.preventDefault();
        }
      }}
      style={baseStyle}
      className="relative flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl shadow-lg px-1.5 py-1 select-none"
    >
      <div style={arrowStyle} />
      {/* Text color */}
      <button
        title="Text color"
        onMouseDown={e => { e.preventDefault(); saveRange(); colorInputRef.current?.click(); }}
        className={plain + ' relative'}
      >
        <span className="text-sm font-bold leading-none text-slate-800" style={{ fontFamily: 'serif', textDecoration: 'underline', textDecorationColor: currentTextColor, textUnderlineOffset: '2px', textDecorationThickness: '2.5px' }}>A</span>
        <input
          ref={colorInputRef}
          type="color"
          value={currentTextColor}
          onChange={e => { restoreRange(); exec('foreColor', e.target.value); }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          tabIndex={-1}
        />
      </button>

      {/* Highlight color */}
      <button
        title="Highlight color"
        onMouseDown={e => { e.preventDefault(); saveRange(); bgColorInputRef.current?.click(); }}
        className={plain + ' relative'}
      >
        <span
          className="w-3.5 h-3.5 rounded-sm block border border-slate-200"
          style={currentHighlightColor
            ? { background: currentHighlightColor }
            : { backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%)', backgroundSize: '6px 6px', backgroundPosition: '0 0, 3px 3px' }
          }
        />
        <input
          ref={bgColorInputRef}
          type="color"
          value={currentHighlightColor || '#ffffff'}
          onChange={e => { restoreRange(); exec('hiliteColor', e.target.value); }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          tabIndex={-1}
        />
      </button>

      <Divider />

      {/* Font family */}
      <ToolbarDropdown
        title="Font family"
        value={currentFontFamily}
        options={FONT_FAMILIES}
        width="64px"
        menuWidth={150}
        onOpen={saveRange}
        onSelect={(v) => { restoreRange(); handleFontFamily(v); }}
      />

      {/* Font size */}
      <ToolbarDropdown
        title="Font size"
        value={currentFontSize}
        options={FONT_SIZES.map(s => ({ label: String(s), value: String(s) }))}
        width="34px"
        menuWidth={64}
        onOpen={saveRange}
        onSelect={(v) => { restoreRange(); if (v) handleFontSize(Number(v)); }}
      />

      <Divider />

      {/* Inline: Bold, Italic, Underline, Strikethrough */}
      {INLINE.map(({ cmd, Icon, label }) => (
        <button
          key={cmd}
          title={label}
          onMouseDown={e => { e.preventDefault(); saveRange(); setTimeout(() => exec(cmd), 0); }}
          className={active(fmt[cmd])}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}

      <Divider />

      {/* Alignment */}
      {ALIGN.map(({ cmd, Icon, label }) => (
        <button
          key={cmd}
          title={label}
          onMouseDown={e => { e.preventDefault(); saveRange(); setTimeout(() => exec(cmd), 0); }}
          className={plain}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}

      <Divider />

      {/* Lists - disabled */}
      <button title="Bullet list (not applicable)" disabled className="p-1.5 rounded-lg text-slate-400 opacity-40 cursor-not-allowed">
        <List className="w-3.5 h-3.5" />
      </button>
      <button title="Numbered list (not applicable)" disabled className="p-1.5 rounded-lg text-slate-400 opacity-40 cursor-not-allowed">
        <ListOrdered className="w-3.5 h-3.5" />
      </button>

      {/* Link */}
      <button
        title={isSelectedTextLink ? "Remove link" : "Insert link (Ctrl+K)"}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          if (!isSelectedTextLink) {
            saveRange();
          }
          handleLink();
        }}
        className={plain}
        onMouseUp={e => {
          // Prevent default mouseup behavior to avoid focus change
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {isSelectedTextLink ? (
          <Link2Off className="w-3.5 h-3.5 text-orange-500" />
        ) : (
          <Link className="w-3.5 h-3.5" />
        )}
      </button>

      <Divider />

      {/* Line height */}
      <ToolbarDropdown
        title="Line height"
        value={currentLineHeight}
        options={LINE_HEIGHTS}
        width="34px"
        menuWidth={64}
        align="right"
        onOpen={saveRange}
        onSelect={(v) => { restoreRange(); handleLineHeight(v); }}
      />

      <Divider />

      {/* Clear formatting */}
      <button
        title="Clear formatting"
        onMouseDown={e => { e.preventDefault(); saveRange(); setTimeout(() => exec('removeFormat'), 0); }}
        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
