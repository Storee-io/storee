function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />;
}

function TemplateCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export default function TemplatesLoading() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-[3.75rem] sm:px-6 lg:px-8 xl:px-20 2xl:px-32">
        <div className="text-center mb-12 space-y-4">
          <Skeleton className="h-12 w-72 mx-auto" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
        <div className="flex items-center gap-2 justify-center flex-wrap mb-10">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
