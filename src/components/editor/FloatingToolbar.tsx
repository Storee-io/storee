'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Eraser, Link,
} from 'lucide-react';

interface Props {
  editMode: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
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

export function FloatingToolbar({ editMode, containerRef }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [fmt, setFmt] = useState<Record<FmtKey, boolean>>({
    bold: false, italic: false, underline: false, strikeThrough: false,
  });
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

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

  const refresh = useCallback(() => {
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
    const gap = 8;
    const centerX = r.left + r.width / 2;

    setPos({
      top: Math.max(8, r.top - toolbarH - gap),
      left: Math.min(Math.max(centerX, 240), window.innerWidth - 240),
    });

    setFmt({
      bold:          document.queryCommandState('bold'),
      italic:        document.queryCommandState('italic'),
      underline:     document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    });
  }, [editMode, containerRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, [refresh]);

  useEffect(() => { if (!editMode) setPos(null); }, [editMode]);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    setTimeout(refresh, 0);
  }, [refresh]);

  const handleFontSize = useCallback((size: number) => {
    restoreRange();
    // execCommand fontSize only accepts 1–7; use a workaround via font[size=7] → span
    document.execCommand('fontSize', false, '7');
    const container = containerRef.current;
    container?.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.innerHTML = (el as HTMLElement).innerHTML;
      el.parentNode?.replaceChild(span, el);
    });
    setTimeout(refresh, 0);
  }, [restoreRange, containerRef, refresh]);

  const handleFontFamily = useCallback((family: string) => {
    restoreRange();
    if (family) exec('fontName', family);
  }, [restoreRange, exec]);

  const handleLineHeight = useCallback((lh: string) => {
    restoreRange();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.lineHeight = lh;
    try { range.surroundContents(span); } catch { /* selection crosses elements */ }
    setTimeout(refresh, 0);
  }, [restoreRange, refresh]);

  const handleTextStyle = useCallback((tag: string) => {
    restoreRange();
    exec('formatBlock', `<${tag}>`);
  }, [restoreRange, exec]);

  const handleLink = useCallback(() => {
    saveRange();
    setLinkUrl('');
    setShowLink(true);
  }, [saveRange]);

  const applyLink = useCallback(() => {
    restoreRange();
    const url = linkUrl.trim();
    if (url) {
      exec('createLink', url.startsWith('http') ? url : `https://${url}`);
    }
    setShowLink(false);
  }, [restoreRange, linkUrl, exec]);

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

  // Link input mode
  if (showLink) {
    return (
      <div
        ref={toolbarRef}
        onMouseDown={e => e.preventDefault()}
        style={baseStyle}
        className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl shadow-xl px-2.5 py-1.5 select-none"
      >
        <Link className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          autoFocus
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') applyLink();
            if (e.key === 'Escape') setShowLink(false);
          }}
          placeholder="https://..."
          className="text-sm outline-none border-none w-48 text-slate-700 placeholder:text-slate-300"
        />
        <button onClick={applyLink} className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 px-1">Apply</button>
        <button onClick={() => setShowLink(false)} className="text-xs text-slate-400 hover:text-slate-600 px-1">Cancel</button>
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      onMouseDown={e => e.preventDefault()}
      style={baseStyle}
      className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl shadow-xl px-1.5 py-1 select-none overflow-hidden"
    >
      {/* Text style */}
      <select
        title="Text style"
        defaultValue="p"
        onMouseDown={saveRange}
        onChange={e => handleTextStyle(e.target.value)}
        className={selectCls + ' max-w-[76px]'}
      >
        {TEXT_STYLES.map(s => (
          <option key={s.tag} value={s.tag}>{s.label}</option>
        ))}
      </select>

      <Divider />

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
        onMouseDown={saveRange}
        onChange={e => handleFontFamily(e.target.value)}
        className={selectCls + ' max-w-[72px]'}
      >
        {FONT_FAMILIES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        title="Font size"
        defaultValue="16"
        onMouseDown={saveRange}
        onChange={e => handleFontSize(Number(e.target.value))}
        className={selectCls + ' w-[46px]'}
      >
        {FONT_SIZES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <Divider />

      {/* Inline: Bold, Italic, Underline, Strikethrough */}
      {INLINE.map(({ cmd, Icon, label }) => (
        <button
          key={cmd}
          title={label}
          onMouseDown={e => { e.preventDefault(); exec(cmd); }}
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
          onMouseDown={e => { e.preventDefault(); exec(cmd); }}
          className={plain}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}

      <Divider />

      {/* Lists */}
      <button title="Bullet list" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList'); }} className={plain}>
        <List className="w-3.5 h-3.5" />
      </button>
      <button title="Numbered list" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList'); }} className={plain}>
        <ListOrdered className="w-3.5 h-3.5" />
      </button>

      {/* Link */}
      <button title="Insert link (Ctrl+K)" onMouseDown={e => { e.preventDefault(); handleLink(); }} className={plain}>
        <Link className="w-3.5 h-3.5" />
      </button>

      <Divider />

      {/* Line height */}
      <select
        title="Line height"
        defaultValue="1.5"
        onMouseDown={saveRange}
        onChange={e => handleLineHeight(e.target.value)}
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
        onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }}
        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
