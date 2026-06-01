'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Eraser,
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

const LISTS: { cmd: string; Icon: React.ElementType; label: string }[] = [
  { cmd: 'insertUnorderedList', Icon: List,         label: 'Bullet list' },
  { cmd: 'insertOrderedList',   Icon: ListOrdered,  label: 'Numbered list' },
];

function Divider() {
  return <div className="w-px h-4 bg-slate-200 mx-0.5 flex-shrink-0" />;
}

export function FloatingToolbar({ editMode, containerRef }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [fmt, setFmt] = useState<Record<FmtKey, boolean>>({
    bold: false, italic: false, underline: false, strikeThrough: false,
  });
  const toolbarRef = useRef<HTMLDivElement>(null);

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

    // Only show inside canvas-editable fields
    const node = range.commonAncestorContainer;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    if (!el?.closest('[data-canvas-field]')) {
      setPos(null);
      return;
    }

    const r = range.getBoundingClientRect();
    const toolbarH = 44;
    const gap = 8;

    setPos({
      top: Math.max(8, r.top - toolbarH - gap),
      left: r.left + r.width / 2,
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

  if (!pos) return null;

  const active = (on: boolean) =>
    `p-1.5 rounded-lg transition-all ${on ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  const plain = 'p-1.5 rounded-lg transition-all text-slate-600 hover:bg-slate-100';

  return (
    <div
      ref={toolbarRef}
      onMouseDown={e => e.preventDefault()} // preserve selection
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      }}
      className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl shadow-xl px-1.5 py-1 select-none"
    >
      {/* Inline formatting */}
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

      {/* Text alignment */}
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
      {LISTS.map(({ cmd, Icon, label }) => (
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
