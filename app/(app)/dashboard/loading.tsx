function Sk({ className }: { className?: string }) {
  return <div className={`sk ${className ?? ''}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="p-6 sm:p-8 space-y-7">

      {/* Page title */}
      <div className="space-y-2.5">
        <Sk className="h-7 w-44 rounded-xl" />
        <Sk className="h-4 w-64 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Sk className="h-3.5 w-16 rounded-md" />
              <Sk className="h-9 w-9 rounded-xl" />
            </div>
            <Sk className="h-7 w-24 rounded-lg" />
            <Sk className="h-2.5 w-14 rounded-md" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Sk className="h-5 w-28 rounded-lg" />
          <Sk className="h-8 w-24 rounded-xl" />
        </div>
        {/* Chart bars */}
        <div className="flex items-end gap-2 h-44 pt-4">
          {[60, 80, 45, 90, 55, 75, 40, 85, 65, 70, 50, 95].map((h, i) => (
            <Sk key={i} className="flex-1 rounded-t-lg rounded-b-none" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <Sk className="h-5 w-32 rounded-lg" />
          <Sk className="h-8 w-20 rounded-xl" />
        </div>
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <Sk className="h-9 w-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-3.5 w-36 rounded-md" />
                <Sk className="h-3 w-20 rounded-md" />
              </div>
              <Sk className="h-6 w-14 rounded-full" />
              <Sk className="h-3.5 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
