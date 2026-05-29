export default function RootLoading() {
  return (
    <>
      <style>{`
        @keyframes sl-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes sl-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sl-bar {
          0%   { transform: scaleX(0);   opacity: 1; }
          75%  { transform: scaleX(0.9); opacity: 1; }
          100% { transform: scaleX(1);   opacity: 0; }
        }
        @keyframes sl-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1; }
        }
        .sl-ring    { animation: sl-spin 1s linear infinite; }
        .sl-content { animation: sl-fade-up 0.5s ease-out both; animation-delay: 0.1s; }
        .sl-bar     { animation: sl-bar 2.4s cubic-bezier(0.4,0,0.2,1) forwards; transform-origin: left; }
        .sl-d1      { animation: sl-dot 1.4s ease-in-out infinite; animation-delay: 0ms;   }
        .sl-d2      { animation: sl-dot 1.4s ease-in-out infinite; animation-delay: 160ms; }
        .sl-d3      { animation: sl-dot 1.4s ease-in-out infinite; animation-delay: 320ms; }
      `}</style>

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden">
        <div className="sl-bar h-full w-full" style={{ background: 'linear-gradient(90deg,#10b981,#14b8a6,#0ea5e9)' }} />
      </div>

      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="sl-content flex flex-col items-center gap-6">

          {/* Spinner + icon */}
          <div className="relative w-[72px] h-[72px] flex items-center justify-center">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />

            {/* Spinning arc */}
            <svg className="sl-ring absolute inset-0" width="72" height="72" viewBox="0 0 72 72" fill="none">
              <defs>
                <linearGradient id="sl-g" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle cx="36" cy="36" r="30" stroke="#f1f5f9" strokeWidth="3" />
              {/* Arc */}
              <circle
                cx="36" cy="36" r="30"
                stroke="url(#sl-g)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="70 118"
                strokeDashoffset="0"
              />
            </svg>

            {/* Center logo icon */}
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/60"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon-white.png" width="22" height="22" alt="" className="w-5.5 h-5.5 object-contain" />
            </div>
          </div>

          {/* Wordmark */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-dark.png" width="88" height="28" alt="Storee" className="h-7 w-auto object-contain opacity-80" />
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            <span className="sl-d1 block w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
            <span className="sl-d2 block w-1.5 h-1.5 rounded-full" style={{ background: '#14b8a6' }} />
            <span className="sl-d3 block w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
          </div>
        </div>
      </div>
    </>
  );
}
