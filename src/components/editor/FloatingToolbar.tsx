'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Eraser, Link, Link2Off,
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

export function FloatingToolbar({ editMode, containerRef, primaryColor = '#10b981' }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const [fmt, setFmt] = useState<Record<FmtKey, boolean>>({
    bold: false, italic: false, underline: false, strikeThrough: false,
  });
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isSelectedTextLink, setIsSelectedTextLink] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreRange = useCallback(() => {
    const range = savedRangeRef.current;
    if (!range) return;
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

    // Check if element is or is inside an <a> tag
    const linkElement = el?.closest('a[href]') as HTMLAnchorElement | null;
    return { isLink: !!linkElement, linkElement };
  }, []);

  const removeLink = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    const linkElement = el?.closest('a[href]') as HTMLAnchorElement | null;

    if (linkElement) {
      console.log('[FloatingToolbar] Removing link:', linkElement.href);
      // Replace link element with its text content
      const textNode = document.createTextNode(linkElement.textContent ?? '');
      linkElement.parentNode?.replaceChild(textNode, linkElement);

      // Restore selection to the text node
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(textNode);
      sel.addRange(newRange);

      setIsSelectedTextLink(false);
      console.log('[FloatingToolbar] Link removed');
    }
  }, []);

  const updateCurrentFontSize = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setCurrentFontSize('16');
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;

    // Get the element - could be the container itself or the parent of a text node
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (!el) {
      setCurrentFontSize('16');
      return;
    }

    // Collect all unique font sizes from the selection
    const fontSizes = new Set<string>();

    // Check the current element first
    if (el.nodeType === Node.ELEMENT_NODE) {
      const inlineStyle = (el as HTMLElement).style?.fontSize;
      if (inlineStyle) {
        const match = inlineStyle.match(/(\d+)/);
        if (match) {
          fontSizes.add(match[1]);
        }
      }
    }

    // Check all child elements of the selected element for font sizes
    const collectFontSizes = (parent: Node) => {
      for (let i = 0; i < parent.childNodes.length; i++) {
        const child = parent.childNodes[i];

        if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as HTMLElement;
          const inlineStyle = childEl.style?.fontSize;

          if (inlineStyle) {
            const match = inlineStyle.match(/(\d+)/);
            if (match) {
              fontSizes.add(match[1]);
            }
          }

          // Recursively check children
          collectFontSizes(child);
        }
      }
    };

    collectFontSizes(el);

    // If we found font sizes
    if (fontSizes.size > 0) {
      if (fontSizes.size === 1) {
        // Single font size - show it
        const size = Array.from(fontSizes)[0];
        if (FONT_SIZES.includes(Number(size))) {
          setCurrentFontSize(size);
          return;
        }
      } else {
        // Multiple different font sizes - show empty/mixed indicator
        setCurrentFontSize('');
        return;
      }
    }

    // No inline styles found, use computed font size
    const computedStyle = window.getComputedStyle(el as HTMLElement);
    const fontSize = computedStyle.fontSize;

    // Extract the number from "24px"
    const sizeMatch = fontSize.match(/(\d+)/);
    if (sizeMatch) {
      const size = sizeMatch[1];
      // Only update if it's in our FONT_SIZES array
      if (FONT_SIZES.includes(Number(size))) {
        setCurrentFontSize(size);
      } else {
        // Computed size not in our list, show default
        setCurrentFontSize('16');
      }
    }
  }, []);

  const refresh = useCallback(() => {
    // Don't update pos when link input is active - preserve toolbar position
    if (showLink) {
      console.log('[FloatingToolbar] refresh called but showLink is true, skipping pos update');
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

    const r = range.getBoundingClientRect();
    const toolbarH = 44;
    const gap = 28;
    const centerX = r.left + r.width / 2;

    // If there's not enough room above, flip toolbar to below the selection
    const spaceAbove = r.top;
    const below = spaceAbove < toolbarH + gap + 16;

    setPos({
      top: below ? r.bottom + gap : r.top - toolbarH - gap,
      left: Math.min(Math.max(centerX, 240), window.innerWidth - 240),
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
  }, [editMode, containerRef, updateCurrentFontSize, showLink, checkIfSelectedTextIsLink]);

  useEffect(() => {
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, [refresh]);

  useEffect(() => { if (!editMode) setPos(null); }, [editMode]);

  // Monitor showLink state changes
  useEffect(() => {
    console.log('[FloatingToolbar] showLink state changed to:', showLink);
  }, [showLink]);

  // Explicitly focus link input when link mode is activated
  useEffect(() => {
    if (showLink && linkInputRef.current) {
      console.log('[FloatingToolbar] useEffect: showLink is true, focusing input');
      setTimeout(() => {
        if (linkInputRef.current) {
          linkInputRef.current.focus();
          linkInputRef.current.select();
          console.log('[FloatingToolbar] Link input focused and selected');
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
      const success = document.execCommand(cmd, false, value);
      console.log(`execCommand(${cmd}, ${value}):`, success);
    } catch (err) {
      console.error(`Error in exec(${cmd}):`, err);
    }
    setTimeout(refresh, 0);
  }, [refresh, restoreRange]);

  const handleFontSize = useCallback((size: number) => {
    console.log('handleFontSize called with size:', size);
    restoreRange();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      console.log('No selection');
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    const editorField = el?.closest('[data-editor-field]') as HTMLElement;

    if (!editorField) {
      console.log('No editor field');
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
      console.log('No selection for line height');
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    const editorField = el?.closest('[data-editor-field]') as HTMLElement;

    if (!editorField) {
      console.log('No editor field found for line height');
      return;
    }

    try {
      // Focus field first
      editorField.focus();
      console.log('Field focused for line height');

      // Restore selection after focus
      sel.removeAllRanges();
      sel.addRange(range);

      const span = document.createElement('span');
      span.style.lineHeight = lh;
      console.log('Created span with lineHeight:', lh);

      try {
        console.log('Trying surroundContents...');
        range.surroundContents(span);
        console.log('surroundContents succeeded');
      } catch (e) {
        console.log('surroundContents failed, trying extractContents fallback...');
        // If surroundContents fails (e.g., selection crosses elements), use insertNode
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
        console.log('extractContents fallback succeeded');
      }
      console.log('Line height applied:', lh);
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
      console.log('[FloatingToolbar] handleLink called, isLink:', isLink);

      if (isLink) {
        // Remove link if text is already a link
        console.log('[FloatingToolbar] Selected text is a link, removing it');
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
        console.log('[FloatingToolbar] Selected text is not a link, opening dialog');
        saveRange();
        console.log('[FloatingToolbar] saveRange completed, savedRangeRef:', savedRangeRef.current);
        setLinkUrl('');
        setShowLink(true);
        console.log('[FloatingToolbar] setShowLink(true) called');
      }
    } catch (err) {
      console.error('[FloatingToolbar] Error in handleLink:', err);
    }
  }, [saveRange, checkIfSelectedTextIsLink, removeLink]);

  // Cancel link input and restore focus + selection to editor field
  const cancelLink = useCallback(() => {
    console.log('[FloatingToolbar] cancelLink called');
    setShowLink(false);
    const range = savedRangeRef.current;
    console.log('[FloatingToolbar] savedRangeRef.current:', range);
    if (range) {
      const container = range.commonAncestorContainer;
      const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
      const editorField = el?.closest('[data-editor-field]') as HTMLElement | null;
      if (editorField) {
        console.log('[FloatingToolbar] Restoring focus to editor field');
        editorField.focus();
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        console.log('[FloatingToolbar] Selection restored');
        // Manually trigger refresh after restoring selection
        setTimeout(() => refresh(), 0);
      }
    }
  }, [refresh]);

  const applyLink = useCallback(() => {
    try {
      console.log('[FloatingToolbar] applyLink called with linkUrl:', linkUrl);

      const url = linkUrl.trim();
      console.log('[FloatingToolbar] Trimmed URL:', url);

      if (!url) {
        console.log('[FloatingToolbar] URL is empty, canceling');
        cancelLink();
        return;
      }

      // Try to restore saved range first
      console.log('[FloatingToolbar] Attempting to restore saved range');
      restoreRange();

      // Get current selection after restore
      const sel = window.getSelection();
      console.log('[FloatingToolbar] Current selection after restore:', sel?.toString(), 'rangeCount:', sel?.rangeCount);

      if (!sel || !sel.rangeCount) {
        console.log('[FloatingToolbar] No selection found after restore, canceling');
        cancelLink();
        return;
      }

      const range = sel.getRangeAt(0);
      console.log('[FloatingToolbar] Got range from selection');

      const container = range.commonAncestorContainer;
      const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
      const editorField = el?.closest('[data-editor-field]') as HTMLElement;

      console.log('[FloatingToolbar] Found editor field:', !!editorField, 'el:', el?.tagName);

      if (!editorField) {
        console.log('[FloatingToolbar] No editor field found, canceling');
        cancelLink();
        return;
      }

      // Ensure focus and selection are ready
      console.log('[FloatingToolbar] Focusing editor field and ensuring selection');
      editorField.focus();

      // Ensure selection is still valid
      sel.removeAllRanges();
      sel.addRange(range);
      console.log('[FloatingToolbar] Selection re-applied');

      // Create link using execCommand
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      console.log('[FloatingToolbar] About to execute createLink with URL:', fullUrl);
      console.log('[FloatingToolbar] Selection before execCommand:', sel.toString());

      const result = document.execCommand('createLink', false, fullUrl);
      console.log('[FloatingToolbar] execCommand("createLink") returned:', result);

      // Check if link was actually created and apply styling
      console.log('[FloatingToolbar] Checking if link was created');
      const linkElements = editorField.querySelectorAll('a[href]');
      console.log('[FloatingToolbar] Found', linkElements.length, 'link elements');

      // Apply primary color and underline styling to newly created links
      linkElements.forEach(link => {
        const a = link as HTMLAnchorElement;
        // Apply primary color and text decoration
        a.style.color = primaryColor;
        a.style.textDecoration = 'underline';
        console.log('[FloatingToolbar] Styled link with color:', primaryColor);
      });

      // Trigger onBlur to save the new content with link to parent
      console.log('[FloatingToolbar] Triggering blur to save content with link');
      editorField.blur();

      // Re-focus to allow further editing
      setTimeout(() => {
        editorField.focus();
        console.log('[FloatingToolbar] Re-focused editor field after save');
      }, 0);

      console.log('[FloatingToolbar] Link operation completed');
    } catch (err) {
      console.error('[FloatingToolbar] Error in applyLink:', err);
      console.error('[FloatingToolbar] Error stack:', err instanceof Error ? err.stack : 'N/A');
    } finally {
      console.log('[FloatingToolbar] applyLink finally: closing link mode and refreshing');
      setShowLink(false);
      setTimeout(refresh, 0);
    }
  }, [restoreRange, linkUrl, refresh, cancelLink]);

  if (!pos) return null;

  const active = (on: boolean) =>
    `p-1.5 rounded-lg transition-all ${on ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  const plain = 'p-1.5 rounded-lg transition-all text-slate-600 hover:bg-slate-100';
  const selectCls = 'text-xs text-slate-600 border-0 outline-none bg-transparent cursor-pointer hover:bg-slate-100 rounded px-1 py-1';

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
    console.log('[FloatingToolbar] Rendering link input mode');
    return (
      <div
        ref={toolbarRef}
        style={baseStyle}
        className="relative flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl shadow-lg px-2.5 py-1.5 select-none"
      >
        <div style={arrowStyle} />
        <Link className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          autoFocus
          ref={linkInputRef}
          value={linkUrl}
          onChange={e => {
            console.log('[FloatingToolbar] Input onChange:', e.target.value);
            setLinkUrl(e.target.value);
          }}
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
          onFocus={() => console.log('[FloatingToolbar] Input focused')}
          placeholder="https://..."
          className="text-sm outline-none border-none w-48 text-slate-700 placeholder:text-slate-300 bg-transparent"
          style={{ display: 'block', visibility: 'visible' }}
        />
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={e => {
            console.log('[FloatingToolbar] Apply button clicked');
            applyLink();
          }}
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
        <span className="text-sm font-bold leading-none text-slate-800" style={{ fontFamily: 'serif', textDecoration: 'underline', textDecorationColor: '#ef4444', textUnderlineOffset: '2px' }}>A</span>
        <input
          ref={colorInputRef}
          type="color"
          defaultValue="#000000"
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
        <span className="w-3.5 h-3.5 rounded-sm block border border-slate-200" style={{ background: 'linear-gradient(135deg, #fef08a 50%, #fdba74 50%)' }} />
        <input
          ref={bgColorInputRef}
          type="color"
          defaultValue="#fef08a"
          onChange={e => { restoreRange(); exec('hiliteColor', e.target.value); }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          tabIndex={-1}
        />
      </button>

      <Divider />

      {/* Font family */}
      <select
        title="Font family"
        defaultValue=""
        tabIndex={-1}
        onMouseDown={e => saveRange()}
        onChange={e => {
          restoreRange();
          handleFontFamily(e.target.value);
          // Reset to allow re-selecting same value
          (e.target as HTMLSelectElement).value = '';
        }}
        onBlur={() => restoreRange()}
        className={selectCls + ' max-w-[72px]'}
      >
        {FONT_FAMILIES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        title="Font size"
        value={currentFontSize}
        tabIndex={-1}
        onMouseDown={e => saveRange()}
        onChange={e => {
          console.log('Font size changed to:', e.target.value);
          restoreRange();
          if (e.target.value) {
            handleFontSize(Number(e.target.value));
          }
          // Let updateCurrentFontSize handle the state update via refresh
        }}
        onBlur={() => restoreRange()}
        className={selectCls + ' w-[46px]'}
      >
        <option value="">---</option>
        {FONT_SIZES.map(s => (
          <option key={s} value={String(s)}>{s}</option>
        ))}
      </select>

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
          console.log('[FloatingToolbar] Link button onMouseDown fired, isSelectedTextLink:', isSelectedTextLink);
          e.preventDefault();
          e.stopPropagation();
          const sel = window.getSelection();
          console.log('[FloatingToolbar] Current selection before handleLink:', sel?.toString());
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
      <select
        title="Line height"
        defaultValue="1.5"
        tabIndex={-1}
        onMouseDown={e => saveRange()}
        onChange={e => {
          restoreRange();
          handleLineHeight(e.target.value);
          // Reset to allow re-selecting same value
          (e.target as HTMLSelectElement).value = '1.5';
        }}
        onBlur={() => restoreRange()}
        className={selectCls + ' w-[48px]'}
      >
        {LINE_HEIGHTS.map(l => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>

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
