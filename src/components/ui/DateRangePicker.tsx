'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface DateRange {
  from: Date;
  to: Date;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0,0,0,0); return r;
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return startOfDay(r);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmtDisplay(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

type PresetKey = 'today'|'yesterday'|'this_week'|'this_month'|'last_7'|'last_14'|'last_30'|'last_month'|'custom';

interface Preset { key: PresetKey; label: string }

const PRESETS: Preset[] = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: 'this_week',  label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_7',     label: 'Last 7 Days' },
  { key: 'last_14',    label: 'Last 14 Days' },
  { key: 'last_30',    label: 'Last 30 Days' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom',     label: 'Custom' },
];

function getPresetRange(key: PresetKey): DateRange | null {
  const today = startOfDay(new Date());
  switch (key) {
    case 'today':      return { from: today, to: today };
    case 'yesterday':  { const y = addDays(today, -1); return { from: y, to: y }; }
    case 'this_week':  return { from: startOfWeek(today), to: today };
    case 'this_month': return { from: startOfMonth(today), to: today };
    case 'last_7':     return { from: addDays(today, -6), to: today };
    case 'last_14':    return { from: addDays(today, -13), to: today };
    case 'last_30':    return { from: addDays(today, -29), to: today };
    case 'last_month': {
      const fm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { from: fm, to: endOfMonth(fm) };
    }
    default: return null;
  }
}

function detectPreset(range: DateRange): PresetKey {
  for (const p of PRESETS) {
    if (p.key === 'custom') continue;
    const r = getPresetRange(p.key);
    if (r && fmt(r.from) === fmt(range.from) && fmt(r.to) === fmt(range.to)) return p.key;
  }
  return 'custom';
}

// ── Calendar month view ───────────────────────────────────────────────────────

interface MonthProps {
  year: number;
  month: number; // 0-based
  rangeFrom: Date | null;
  rangeTo: Date | null;
  hovered: Date | null;
  selecting: boolean; // true = waiting for second click
  onDateClick: (d: Date) => void;
  onDateHover: (d: Date) => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  showPrevNav: boolean;
  showNextNav: boolean;
}

function MonthCalendar({ year, month, rangeFrom, rangeTo, hovered, selecting, onDateClick, onDateHover, onPrevYear, onNextYear, onPrevMonth, onNextMonth, showPrevNav, showNextNav }: MonthProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const effectiveTo = selecting && hovered ? hovered : rangeTo;

  const inRange = (d: Date) => {
    if (!rangeFrom || !effectiveTo) return false;
    const lo = rangeFrom <= effectiveTo ? rangeFrom : effectiveTo;
    const hi = rangeFrom <= effectiveTo ? effectiveTo : rangeFrom;
    return d > lo && d < hi;
  };
  const isStart = (d: Date) => !!rangeFrom && isSameDay(d, rangeFrom);
  const isEnd   = (d: Date) => !!effectiveTo && isSameDay(d, effectiveTo);

  const cells: { date: Date; curMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevDays - i), curMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), curMonth: true });
  }
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++) {
    cells.push({ date: new Date(year, month + 1, d), curMonth: false });
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-0.5">
          {showPrevNav && (
            <>
              <button onClick={onPrevYear} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={onPrevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800">{MONTHS[month]}  {year}</p>
        <div className="flex items-center gap-0.5">
          {showNextNav && (
            <>
              <button onClick={onNextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={onNextYear} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map(({ date, curMonth }, i) => {
          const start = isStart(date);
          const end   = isEnd(date);
          const range = inRange(date);
          const today = isSameDay(date, new Date());

          return (
            <div key={i} className="relative flex items-center justify-center h-9">
              {/* Range bg strip */}
              {(range || (start && end) || (start && effectiveTo && date < effectiveTo) || (end && rangeFrom && date > rangeFrom)) && (
                <div className={`absolute inset-y-0.5 bg-emerald-50 ${
                  start ? 'left-1/2 right-0' : end ? 'left-0 right-1/2' : 'left-0 right-0'
                }`} />
              )}
              <button
                onClick={() => curMonth && onDateClick(date)}
                onMouseEnter={() => onDateHover(date)}
                className={`relative z-10 w-8 h-8 rounded-full text-[13px] font-medium transition-all
                  ${!curMonth ? 'text-slate-300 cursor-default' : ''}
                  ${curMonth && !start && !end ? 'hover:bg-emerald-100 text-slate-700' : ''}
                  ${(start || end) && curMonth ? 'bg-emerald-500 text-white font-bold shadow-sm' : ''}
                  ${today && !start && !end && curMonth ? 'ring-1 ring-emerald-400' : ''}
                `}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>(() => detectPreset(value));

  // Calendar navigation: left month
  const today = new Date();
  const [leftYear,  setLeftYear]  = useState(value.from.getFullYear());
  const [leftMonth, setLeftMonth] = useState(value.from.getMonth());

  const rightYear  = leftMonth === 11 ? leftYear + 1 : leftYear;
  const rightMonth = (leftMonth + 1) % 12;

  // Selection state
  const [selecting, setSelecting] = useState(false);
  const [tempFrom,  setTempFrom]  = useState<Date | null>(value.from);
  const [tempTo,    setTempTo]    = useState<Date | null>(value.to);
  const [hovered,   setHovered]   = useState<Date | null>(null);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handlePreset = (key: PresetKey) => {
    setActivePreset(key);
    if (key === 'custom') return;
    const r = getPresetRange(key);
    if (!r) return;
    setTempFrom(r.from);
    setTempTo(r.to);
    setSelecting(false);
    onChange(r);
    setLeftYear(r.from.getFullYear());
    setLeftMonth(r.from.getMonth());
  };

  const handleDateClick = (d: Date) => {
    setActivePreset('custom');
    if (!selecting) {
      setTempFrom(d);
      setTempTo(null);
      setSelecting(true);
    } else {
      const from = tempFrom!;
      const [lo, hi] = d < from ? [d, from] : [from, d];
      setTempFrom(lo);
      setTempTo(hi);
      setSelecting(false);
      onChange({ from: lo, to: hi });
    }
  };

  const prevMonth = () => {
    if (leftMonth === 0) { setLeftYear(y => y - 1); setLeftMonth(11); }
    else setLeftMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (leftMonth === 11) { setLeftYear(y => y + 1); setLeftMonth(0); }
    else setLeftMonth(m => m + 1);
  };
  const prevYear = () => setLeftYear(y => y - 1);
  const nextYear = () => setLeftYear(y => y + 1);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2.5 px-4 py-2 bg-white border rounded-xl text-sm transition-all ${
          open ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="font-medium text-slate-700">{fmtDisplay(value.from)}</span>
        <span className="text-slate-400">→</span>
        <span className="font-medium text-slate-700">{fmtDisplay(value.to)}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 right-0 z-[200] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex"
          style={{ minWidth: 640 }}>

          {/* Preset sidebar */}
          <div className="w-44 border-r border-slate-100 py-4 px-3 flex-shrink-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Period</p>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
                  activePreset === p.key
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                {p.label}
                {activePreset === p.key && <Check className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
            ))}
          </div>

          {/* Calendar area */}
          <div className="flex-1 p-5">
            {/* Input display */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${selecting ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}>
                <span className="text-slate-500 text-xs font-medium">From</span>
                <span className="font-semibold text-slate-800">{tempFrom ? fmt(tempFrom) : '—'}</span>
              </div>
              <span className="text-slate-400 text-sm">→</span>
              <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${!selecting && tempTo ? 'border-slate-200 bg-slate-50' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                <span className="text-slate-500 text-xs font-medium">To</span>
                <span className="font-semibold text-slate-800">{tempTo ? fmt(tempTo) : '—'}</span>
              </div>
            </div>

            {/* Dual calendar */}
            <div className="flex gap-6">
              <MonthCalendar
                year={leftYear} month={leftMonth}
                rangeFrom={tempFrom} rangeTo={tempTo} hovered={hovered} selecting={selecting}
                onDateClick={handleDateClick} onDateHover={setHovered}
                onPrevMonth={prevMonth} onNextMonth={() => {}}
                onPrevYear={prevYear} onNextYear={() => {}}
                showPrevNav={true} showNextNav={false}
              />
              <div className="w-px bg-slate-100 self-stretch" />
              <MonthCalendar
                year={rightYear} month={rightMonth}
                rangeFrom={tempFrom} rangeTo={tempTo} hovered={hovered} selecting={selecting}
                onDateClick={handleDateClick} onDateHover={setHovered}
                onPrevMonth={() => {}} onNextMonth={nextMonth}
                onPrevYear={() => {}} onNextYear={nextYear}
                showPrevNav={false} showNextNav={true}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {selecting ? 'Click a date to set end date' : tempFrom && tempTo ? `${Math.round((tempTo.getTime() - tempFrom.getTime()) / 86400000) + 1} days selected` : ''}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => { if (tempFrom && tempTo) { onChange({ from: tempFrom, to: tempTo }); setOpen(false); } }}
                  disabled={!tempFrom || !tempTo || selecting}
                  className="px-4 py-2 text-sm font-semibold gradient-bg text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
