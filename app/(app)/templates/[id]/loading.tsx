function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />;
}

export default function TemplatePreviewLoading() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <div className="h-5 w-px bg-slate-200" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="flex-1 p-8 flex justify-center items-start">
        <Skeleton className="w-full max-w-5xl h-[600px] rounded-2xl" />
      </div>
    </div>
  );
}
