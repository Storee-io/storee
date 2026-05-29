function Sk({ className }: { className?: string }) {
  return <div className={`sk ${className ?? ''}`} />;
}

export default function TemplatePreviewLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Sk className="h-8 w-24 rounded-xl" />
          <div className="h-5 w-px bg-slate-100" />
          <Sk className="h-4 w-40 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          {/* Device toggle pills */}
          <Sk className="h-8 w-24 rounded-xl" />
          <Sk className="h-8 w-28 rounded-xl" />
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-start justify-center p-8 gap-6">
        {/* Main preview */}
        <Sk className="w-full max-w-4xl h-[640px] rounded-2xl" />
      </div>

    </div>
  );
}
