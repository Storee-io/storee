export default function StoreLoading() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .sk {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf3 50%, #f1f5f9 75%);
          background-size: 600px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .store-loading { animation: fade-in 0.25s ease-out both; }
      `}</style>

      <div className="store-loading min-h-screen bg-white">

        {/* Nav */}
        <header className="h-16 border-b border-slate-100 px-6 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="sk h-7 w-28 rounded-lg" />
          <div className="flex items-center gap-3">
            <div className="sk h-5 w-16 rounded-md hidden sm:block" />
            <div className="sk h-5 w-16 rounded-md hidden sm:block" />
            <div className="sk h-9 w-9 rounded-full" />
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-10 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="sk h-3.5 w-24 rounded-full" />
            <div className="space-y-3">
              <div className="sk h-10 w-full rounded-xl" />
              <div className="sk h-10 w-4/5 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="sk h-4 w-full rounded-md" />
              <div className="sk h-4 w-5/6 rounded-md" />
              <div className="sk h-4 w-3/4 rounded-md" />
            </div>
            <div className="flex gap-3 pt-2">
              <div className="sk h-11 w-36 rounded-xl" />
              <div className="sk h-11 w-28 rounded-xl" />
            </div>
          </div>
          <div className="sk h-72 md:h-96 w-full rounded-2xl" />
        </section>

        {/* Products heading */}
        <section className="max-w-7xl mx-auto px-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="sk h-6 w-40 rounded-lg" />
            <div className="sk h-4 w-20 rounded-md" />
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="sk aspect-square w-full rounded-2xl" />
                <div className="space-y-1.5 px-0.5">
                  <div className="sk h-3.5 w-4/5 rounded-md" />
                  <div className="sk h-3 w-1/2 rounded-md" />
                  <div className="sk h-4 w-1/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
