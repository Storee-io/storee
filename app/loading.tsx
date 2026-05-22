export default function RootLoading() {
  return (
    <>
      <style>{`
        @keyframes storee-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes storee-glow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes storee-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.25; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes storee-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 0.6; transform: translateY(0); }
        }
        .sl-spinner  { animation: storee-spin 1.1s linear infinite; transform-origin: center; }
        .sl-icon     { animation: storee-glow 2s ease-in-out infinite; }
        .sl-dot-1    { animation: storee-dot 1.2s ease-in-out infinite; animation-delay: 0ms; }
        .sl-dot-2    { animation: storee-dot 1.2s ease-in-out infinite; animation-delay: 150ms; }
        .sl-dot-3    { animation: storee-dot 1.2s ease-in-out infinite; animation-delay: 300ms; }
        .sl-label    { animation: storee-fadein 0.6s ease-out both; animation-delay: 0.15s; }
      `}</style>

      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">

          {/* Spinner ring + icon */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg
              className="sl-spinner absolute inset-0"
              width="80" height="80" viewBox="0 0 80 80"
              fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="sl-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="4" />
              {/* Arc — ~38% of circumference ≈ 81 of 214 */}
              <circle
                cx="40" cy="40" r="34"
                stroke="url(#sl-grad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="81 133"
                strokeDashoffset="0"
              />
            </svg>

            {/* Center branded icon */}
            <div className="sl-icon w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-icon-white.png"
                width="24" height="24"
                alt=""
                className="w-6 h-6 object-contain"
              />
            </div>
          </div>

          {/* Storee wordmark */}
          <div className="sl-label">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-dark.png"
              width="96" height="30"
              alt="Storee"
              className="h-7 w-auto object-contain"
            />
          </div>

          {/* Staggered dots */}
          <div className="flex items-center gap-1.5">
            <span className="sl-dot-1 block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="sl-dot-2 block w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span className="sl-dot-3 block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>

        </div>
      </div>
    </>
  );
}
