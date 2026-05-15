import { Star } from 'lucide-react';
import { testimonials } from '../../data/dummyData';
import AnimateOnView from '@/src/components/ui/AnimateOnView';
import { Card } from '@/components/ui/card';

export default function Testimonials() {
  return (
    <section className="py-24 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <AnimateOnView className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm text-slate-600 font-medium mb-4 shadow-sm border border-slate-200">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Customer Reviews
          </AnimateOnView>
          <AnimateOnView delay={0.1}>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
              Loved by <span className="gradient-text">Brands</span>
            </h2>
          </AnimateOnView>
          <AnimateOnView delay={0.2}>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Join thousands of business owners who built their dream stores with Storee
            </p>
          </AnimateOnView>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimateOnView key={t.name} delay={i * 0.1} y={24}>
              <Card className="p-6 card-hover relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color}`} />
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role} · {t.company}</p>
                  </div>
                </div>
              </Card>
            </AnimateOnView>
          ))}
        </div>

        <AnimateOnView delay={0.4} className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '1,000+', label: 'Stores Created' },
            { value: '4.9/5', label: 'Average Rating' },
            { value: '98%', label: 'Customer Satisfaction' },
            { value: '<5min', label: 'Average Setup Time' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold gradient-text mb-1">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </AnimateOnView>
      </div>
    </section>
  );
}
