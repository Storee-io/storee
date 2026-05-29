/**
 * Brand-aware storefront skeleton.
 * Receives the store's real primaryColor so shimmer accents match.
 */
export default function StoreSkeleton({
  primaryColor = '#10b981',
  name = '',
}: {
  primaryColor?: string;
  name?: string;
}) {
  // Lighten the primary color for subtle accents (just use opacity)
  return (
    <>
      <style>{`
        @keyframes sk-shimmer {
          0%   { background-position: -700px 0; }
          100% { background-position:  700px 0; }
        }
        .sk {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf3 50%, #f1f5f9 75%);
          background-size: 700px 100%;
          animation: sk-shimmer 1.5s ease-in-out infinite;
          border-radius: 0.5rem;
        }
        @keyframes sk-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .sk-wrap { animation: sk-fade 0.2s ease-out both; }

        /* Thin brand-colored progress bar at top */
        @keyframes sk-bar {
          0%   { transform: scaleX(0.05); }
          60%  { transform: scaleX(0.8);  }
          85%  { transform: scaleX(0.92); }
          100% { transform: scaleX(1);    }
        }
        .sk-bar {
          animation: sk-bar 2s cubic-bezier(0.1, 0.6, 0.4, 1) forwards;
          transform-origin: left;
        }
      `}</style>

      {/* Brand-colored top bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-50 overflow-hidden">
        <div
          className="sk-bar h-full w-full"
          style={{ background: primaryColor }}
        />
      </div>

      <div className="sk-wrap min-h-screen bg-white">

        {/* Promo bar */}
        <div className="h-8 w-full" style={{ background: primaryColor, opacity: 0.12 }} />

        {/* Nav */}
        <header className="h-16 border-b border-slate-100 px-6 flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo placeholder — shows store name initial if available */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0"
              style={{ background: primaryColor, opacity: 0.2 }}
            />
            {name ? (
              <span className="text-sm font-semibold text-slate-300 tracking-wide">{name}</span>
            ) : (
              <div className="sk h-5 w-28" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="sk h-4 w-14 hidden sm:block" />
            <div className="sk h-4 w-14 hidden sm:block" />
            <div className="sk h-4 w-14 hidden sm:block" />
            <div className="sk h-8 w-8 rounded-full" />
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-12 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5 order-2 md:order-1">
            {/* Badge */}
            <div
              className="h-5 w-20 rounded-full"
              style={{ background: primaryColor, opacity: 0.15 }}
            />
            {/* Title lines */}
            <div className="space-y-3">
              <div className="sk h-10 w-full" style={{ borderRadius: '0.75rem' }} />
              <div className="sk h-10 w-4/5" style={{ borderRadius: '0.75rem' }} />
            </div>
            {/* Subtitle */}
            <div className="space-y-2 pt-1">
              <div className="sk h-4 w-full" />
              <div className="sk h-4 w-5/6" />
              <div className="sk h-4 w-2/3" />
            </div>
            {/* CTAs */}
            <div className="flex gap-3 pt-3">
              <div
                className="h-11 w-36 rounded-xl"
                style={{ background: primaryColor, opacity: 0.25 }}
              />
              <div className="sk h-11 w-28 rounded-xl" />
            </div>
          </div>
          {/* Hero image */}
          <div className="sk order-1 md:order-2 h-64 sm:h-80 md:h-96 w-full rounded-2xl" />
        </section>

        {/* Section divider */}
        <div className="max-w-7xl mx-auto px-6 pb-2 flex items-center justify-between">
          <div className="sk h-6 w-44" style={{ borderRadius: '0.75rem' }} />
          <div className="sk h-4 w-16" />
        </div>

        {/* Product grid */}
        <section className="max-w-7xl mx-auto px-6 pt-5 pb-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="sk aspect-square w-full rounded-2xl" />
                <div className="space-y-1.5 px-0.5">
                  <div className="sk h-3.5 w-4/5" />
                  <div className="sk h-3 w-1/2" />
                  <div
                    className="h-4 w-1/3 rounded"
                    style={{ background: primaryColor, opacity: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature strip */}
        <div className="border-t border-slate-100 py-10">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl"
                  style={{ background: primaryColor, opacity: 0.12 }}
                />
                <div className="sk h-3.5 w-20" />
                <div className="sk h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
