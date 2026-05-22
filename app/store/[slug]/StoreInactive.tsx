import Link from 'next/link';
import Image from 'next/image';
import { Rocket, Home, Clock } from 'lucide-react';

interface Props {
  name: string;
}

function ClosedStoreIllustration() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Ground */}
      <rect x="0" y="142" width="220" height="18" rx="0" fill="#f8fafc" />
      <ellipse cx="110" cy="142" rx="90" ry="5" fill="#f1f5f9" />

      {/* Building body */}
      <rect x="30" y="68" width="160" height="76" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />

      {/* Awning */}
      <rect x="22" y="50" width="176" height="24" rx="5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      {/* Awning scallop edge */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <path key={i} d={`M${22 + i * 22} 74 Q${33 + i * 22} 82 ${44 + i * 22} 74`} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      ))}

      {/* Store sign on awning */}
      <rect x="62" y="55" width="96" height="13" rx="3" fill="#cbd5e1" />

      {/* Left window */}
      <rect x="38" y="80" width="42" height="32" rx="3" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="1.5" />
      {/* Window cross */}
      <line x1="59" y1="80" x2="59" y2="112" stroke="#bfdbfe" strokeWidth="1" />
      <line x1="38" y1="96" x2="80" y2="96" stroke="#bfdbfe" strokeWidth="1" />
      {/* Shutters closed — dark slats over left window */}
      <rect x="38" y="80" width="42" height="32" rx="3" fill="#cbd5e1" opacity="0.55" />
      {[0,1,2,3,4].map((i) => (
        <line key={i} x1="38" y1={86 + i * 6} x2="80" y2={86 + i * 6} stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />
      ))}

      {/* Right window */}
      <rect x="140" y="80" width="42" height="32" rx="3" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="1.5" />
      <line x1="161" y1="80" x2="161" y2="112" stroke="#bfdbfe" strokeWidth="1" />
      <line x1="140" y1="96" x2="182" y2="96" stroke="#bfdbfe" strokeWidth="1" />
      {/* Shutters closed — dark slats over right window */}
      <rect x="140" y="80" width="42" height="32" rx="3" fill="#cbd5e1" opacity="0.55" />
      {[0,1,2,3,4].map((i) => (
        <line key={i} x1="140" y1={86 + i * 6} x2="182" y2={86 + i * 6} stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />
      ))}

      {/* Door */}
      <rect x="88" y="104" width="44" height="40" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
      {/* Door panels */}
      <rect x="94" y="110" width="14" height="11" rx="2" fill="#e2e8f0" />
      <rect x="112" y="110" width="14" height="11" rx="2" fill="#e2e8f0" />
      {/* Door handle */}
      <circle cx="124" cy="127" r="3" fill="#94a3b8" />
      {/* Door frame gap */}
      <line x1="110" y1="104" x2="110" y2="144" stroke="#e2e8f0" strokeWidth="1" />

      {/* CLOSED sign hanging on door */}
      <line x1="110" y1="98" x2="110" y2="94" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="102" y1="94" x2="118" y2="94" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="84" y="78" width="52" height="18" rx="4" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5" />
      <text x="110" y="91" textAnchor="middle" fill="#b45309" fontFamily="monospace" fontSize="8.5" fontWeight="700" letterSpacing="1.5">CLOSED</text>
    </svg>
  );
}

export default function StoreInactive({ name }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Storee logo */}
        <div className="flex justify-center mb-6">
          <Image src="/logo-dark.png" width={120} height={40} alt="Storee" className="h-10 w-auto object-contain" />
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-4">
          <ClosedStoreIllustration />
        </div>

        {/* Store name */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{name}</h1>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
          <Clock className="w-4 h-4" />
          Store is currently unavailable
        </div>

        {/* Message */}
        <p className="text-slate-500 mb-8 leading-relaxed">
          This store has been temporarily taken offline by the owner.
          Please check back later or contact the store directly.
        </p>

        {/* CTAs */}
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
