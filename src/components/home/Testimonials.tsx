'use client';

import { Star } from 'lucide-react';
import { testimonials } from '../../data/dummyData';
import AnimateOnView from '@/src/components/ui/AnimateOnView';

type Testimonial = typeof testimonials[number];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden mx-3">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color}`} />
      <div className="flex gap-1 mb-3">
        {Array.from({ length: t.rating }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-slate-600 text-sm leading-relaxed mb-5 line-clamp-4">"{t.text}"</p>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {t.avatar}
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
          <p className="text-xs text-slate-500">{t.role} · {t.company}</p>
        </div>
      </div>
    </div>
  );
}

const row1 = [...testimonials, ...testimonials];

export default function Testimonials() {
  return (
    <section className="py-14 sm:py-24 bg-slate-50 overflow-hidden">
      <style>{`
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-left { animation: marquee-left 35s linear infinite; }
        .marquee-track:hover .marquee-left { animation-play-state: paused; }
      `}</style>

      <div className="max-w-5xl mx-auto px-[3.75rem] sm:px-6 lg:px-8 xl:px-20 2xl:px-32">
        <div className="text-center mb-10 sm:mb-14">
          <AnimateOnView className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm text-slate-600 font-medium mb-3 shadow-sm border border-slate-200">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Customer Reviews
          </AnimateOnView>
          <AnimateOnView delay={0.1}>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-3">
              Loved by <span className="gradient-text">Brands</span>
            </h2>
          </AnimateOnView>
          <AnimateOnView delay={0.2}>
            <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
              Join thousands of business owners who built their dream stores with Storee
            </p>
          </AnimateOnView>
        </div>
      </div>

      {/* Carousel — full bleed, no max-w constraint */}
      <div className="marquee-track">
        {/* Row — scroll left, padding vertical agar shadow tidak terpotong */}
        <div
          className="flex [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
          style={{ overflow: 'hidden', paddingTop: '8px', paddingBottom: '12px', marginTop: '-8px', marginBottom: '-12px' }}
        >
          <div className="flex marquee-left">
            {row1.map((t, i) => <TestimonialCard key={i} t={t} />)}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-[3.75rem] sm:px-6 lg:px-8 xl:px-20 2xl:px-32">
        <AnimateOnView delay={0.3} className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { value: '1,000+', label: 'Stores Created' },
            { value: '4.9/5',  label: 'Average Rating' },
            { value: '98%',    label: 'Customer Satisfaction' },
            { value: '<5min',  label: 'Average Setup Time' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold gradient-text mb-1">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </AnimateOnView>
      </div>
    </section>
  );
}
