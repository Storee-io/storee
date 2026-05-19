import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import AnimateOnView from '@/src/components/ui/AnimateOnView';
import { Button } from '@/components/ui/button';

export default function FinalCTA() {
  return (
    <section className="py-14 sm:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-[3.75rem] sm:px-6 lg:px-8 xl:px-20 2xl:px-32">
        <AnimateOnView
          y={40}
          className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 lg:p-16 text-center"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl animate-float">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-white tracking-tight mb-4 sm:mb-6">
              Ready to Build Your
              <br />
              <span className="gradient-text">Dream Store?</span>
            </h2>

            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-7 sm:mb-10 leading-relaxed">
              Join 1,000+ entrepreneurs who launched their online stores with Storee. Get started free — no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gradient-bg hover:opacity-90 shadow-2xl hover:shadow-emerald-500/25 pulse-glow rounded-2xl px-8 py-4 h-auto text-lg">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Building Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/templates">
                <Button size="lg" variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20 hover:text-white rounded-2xl px-8 py-4 h-auto text-lg">
                  Browse Templates
                </Button>
              </Link>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-400">
              {['Free forever plan', 'No credit card required', 'Launch in minutes'].map(label => (
                <span key={label} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </AnimateOnView>
      </div>
    </section>
  );
}
