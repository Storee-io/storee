function Sk({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`sk ${className ?? ''}`} style={style} />;
}

function TemplateCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      <Sk className="h-52 w-full rounded-none rounded-t-2xl" />
      <div className="p-5 space-y-3">
        <Sk className="h-5 w-36 rounded-lg" />
        <Sk className="h-3.5 w-full rounded-md" />
        <Sk className="h-3.5 w-3/4 rounded-md" />
        <Sk className="h-8 w-28 rounded-xl mt-1" />
      </div>
    </div>
  );
}

export default function TemplatesLoading() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-[3.75rem] sm:px-6 lg:px-8 xl:px-20 2xl:px-32">

        {/* Heading */}
        <div className="text-center mb-12 space-y-4 flex flex-col items-center">
          <Sk className="h-11 w-64 rounded-2xl" />
          <Sk className="h-4 w-80 rounded-lg" />
          <Sk className="h-4 w-56 rounded-lg" />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 justify-center flex-wrap mb-10">
          {[80, 72, 88, 64, 76, 68, 84].map((w, i) => (
            <Sk key={i} className="h-9 rounded-full" style={{ width: w }} />
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
