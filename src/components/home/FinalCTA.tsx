import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import AnimateOnView from '@/src/components/ui/AnimateOnView';
import { Button } from '@/components/ui/button';

export default function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden pt-16 sm:pt-36 pb-24 sm:pb-40"
      style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #ecfdf5 14%, #f0fdf4 35%, #e0f2fe 68%, #f0f9ff 100%)' }}
    >
      {/* Kurva atas bergradasi — seperti Hero fade-to-white tapi dengan curve */}
      <div className="absolute top-0 left-0 right-0 leading-[0] pointer-events-none" style={{ zIndex: 2 }}>
        <div className="relative w-full" style={{ paddingTop: '6.25%' }}>
          <svg
            viewBox="0 0 1440 90"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full block"
          >
            <defs>
              <linearGradient id="topCurveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,0 L1440,0 Q720,90 0,0 Z" fill="url(#topCurveGrad)" />
          </svg>
        </div>
        {/* Gradasi tambahan di atas kurva — mirip fade hero */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: '140%', background: 'linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.6) 50%, transparent 100%)' }}
        />
      </div>

      {/* Blobs — mirip HeroSection */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full blur-[90px]"
          style={{ background: 'rgba(20,184,166,0.20)' }}
        />
        <div
          className="absolute -top-16 right-[5%] w-[400px] h-[400px] rounded-full blur-[80px]"
          style={{ background: 'rgba(134,239,172,0.22)' }}
        />
        <div
          className="absolute bottom-24 left-[30%] w-[360px] h-[360px] rounded-full blur-[80px]"
          style={{ background: 'rgba(56,189,248,0.15)' }}
        />
        <div
          className="absolute bottom-10 right-[10%] w-72 h-72 rounded-full blur-[70px]"
          style={{ background: 'rgba(110,231,183,0.18)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 2xl:px-32 text-center">
        <AnimateOnView y={30}>
          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-3 sm:mb-5 leading-tight">
            Ready to Build Your
            <br />
            <span className="gradient-text">Dream Store?</span>
          </h2>

          {/* Subtext */}
          <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto mb-6 sm:mb-9 leading-relaxed">
            Join 1,000+ entrepreneurs who launched their online stores with Storee. Get started free — no credit card required.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/register">
              <Button size="lg" className="gradient-bg hover:opacity-90 shadow-xl hover:shadow-emerald-500/25 pulse-glow rounded-2xl px-6 py-3 sm:px-8 sm:py-4 h-auto text-sm sm:text-base font-semibold w-full sm:w-auto">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Building Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="lg" variant="outline" className="rounded-2xl px-6 py-3 sm:px-8 sm:py-4 h-auto text-sm sm:text-base border-slate-200 text-slate-700 hover:bg-slate-50 w-full sm:w-auto">
                Browse Templates
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-slate-500">
            {['Free forever plan', 'No credit card required', 'Launch in minutes'].map(label => (
              <span key={label} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                {label}
              </span>
            ))}
          </div>
        </AnimateOnView>
      </div>

      {/* Wave curve — tinggi proporsional terhadap lebar layar agar tidak meruncing */}
      <div className="absolute bottom-0 left-0 right-0 leading-[0] pointer-events-none">
        <div className="relative w-full" style={{ paddingTop: '6.25%' /* 90/1440 */ }}>
          <svg
            viewBox="0 0 1440 90"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full block"
          >
            <path d="M0,90 Q720,0 1440,90 L1440,90 L0,90 Z" fill="#134e4a" />
          </svg>
        </div>
      </div>
    </section>
  );
}
