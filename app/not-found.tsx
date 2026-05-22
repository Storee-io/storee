import Link from 'next/link';
import Image from 'next/image';
import { Rocket, Home } from 'lucide-react';

function Illustration404() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Stars */}
      <circle cx="18" cy="22" r="2" fill="#e2e8f0" />
      <circle cx="48" cy="10" r="1.5" fill="#e2e8f0" />
      <circle cx="195" cy="18" r="2" fill="#e2e8f0" />
      <circle cx="210" cy="50" r="1.5" fill="#e2e8f0" />
      <circle cx="12" cy="70" r="1.5" fill="#e2e8f0" />
      <circle cx="205" cy="110" r="2" fill="#e2e8f0" />
      <circle cx="32" cy="130" r="1.5" fill="#e2e8f0" />
      <circle cx="170" cy="148" r="2" fill="#e2e8f0" />
      {/* Dashed orbit ring */}
      <ellipse cx="110" cy="100" rx="68" ry="22" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="5 4" />
      {/* Planet */}
      <circle cx="110" cy="100" r="34" fill="#f1f5f9" />
      <circle cx="110" cy="100" r="34" stroke="#e2e8f0" strokeWidth="1.5" />
      {/* Planet surface craters */}
      <circle cx="97" cy="94" r="7" fill="#e2e8f0" />
      <circle cx="97" cy="94" r="4" fill="#f8fafc" />
      <circle cx="120" cy="110" r="5" fill="#e2e8f0" />
      <circle cx="120" cy="110" r="2.5" fill="#f8fafc" />
      <circle cx="113" cy="88" r="4" fill="#e2e8f0" />
      <circle cx="113" cy="88" r="2" fill="#f8fafc" />
      {/* "404" label on planet */}
      <text x="110" y="104" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="13" fontWeight="800" letterSpacing="1">404</text>
      {/* Astronaut helmet */}
      <circle cx="168" cy="42" r="18" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="1.5" />
      {/* Visor */}
      <path d="M156 38 Q168 30 180 38 Q180 52 168 56 Q156 52 156 38Z" fill="#93c5fd" opacity="0.6" />
      {/* Suit body */}
      <rect x="158" y="58" width="20" height="26" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      {/* Left arm */}
      <rect x="144" y="60" width="16" height="9" rx="4.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(10 152 64)" />
      {/* Right arm */}
      <rect x="176" y="60" width="16" height="9" rx="4.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(-10 184 64)" />
      {/* Left leg */}
      <rect x="158" y="82" width="8" height="16" rx="4" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(-8 162 90)" />
      {/* Right leg */}
      <rect x="170" y="82" width="8" height="16" rx="4" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" transform="rotate(8 174 90)" />
      {/* Tether from astronaut to planet */}
      <path d="M152 72 Q130 80 120 90" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
      {/* Small satellite */}
      <rect x="38" y="48" width="18" height="12" rx="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="28" y="52" width="10" height="4" rx="1" fill="#bfdbfe" />
      <rect x="56" y="52" width="10" height="4" rx="1" fill="#bfdbfe" />
      {/* Ground shadow */}
      <ellipse cx="110" cy="154" rx="55" ry="5" fill="#f1f5f9" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Storee logo */}
        <div className="flex justify-center mb-6">
          <Image src="/logo-dark.png" width={120} height={40} alt="Storee" className="h-10 w-auto object-contain" />
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-4">
          <Illustration404 />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Page not found</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md text-sm"
          >
            <Rocket className="w-4 h-4" />
            Build Your Dream Store
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
