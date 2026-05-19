import { Sparkles, Zap, ShoppingCart, LayoutDashboard, CreditCard, Smartphone } from 'lucide-react';
import AnimateOnView from '@/src/components/ui/AnimateOnView';
import { Card } from '@/components/ui/card';

const advantages = [
  {
    icon: Sparkles,
    title: 'AI Powered',
    description: 'Generate complete stores with a single prompt. Our AI understands your brand, products, and aesthetic.',
    color: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Zap,
    title: 'One-Click Publish',
    description: 'Go from prompt to live store in seconds. Your store is instantly ready to accept orders from customers.',
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: ShoppingCart,
    title: 'Ecommerce Optimized',
    description: 'Built for conversions with fast checkout, cart abandonment recovery, upsells, and smart product recommendations.',
    color: 'from-blue-400 to-indigo-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: LayoutDashboard,
    title: 'Full Dashboard',
    description: 'Manage orders, products, customers, analytics, and marketing from one powerful, intuitive dashboard.',
    color: 'from-purple-400 to-pink-500',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
  {
    icon: CreditCard,
    title: 'Various Payments & Shipping',
    description: 'Accept payments via cards, bank transfers, GoPay, OVO, QRIS, and more. Integrate with major shipping couriers.',
    color: 'from-cyan-400 to-blue-500',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
  },
  {
    icon: Smartphone,
    title: 'Mobile Responsive',
    description: 'Every store is perfectly optimized for mobile shoppers. 70% of customers shop on their phones — we got you covered.',
    color: 'from-rose-400 to-pink-500',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
];

export default function AdvantageGrid() {
  return (
    <section className="py-14 sm:py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-[3.75rem] sm:px-6 lg:px-8 xl:px-20 2xl:px-32">
        <div className="text-center mb-10 sm:mb-16">
          <AnimateOnView className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm text-slate-600 font-medium mb-3 shadow-sm border border-slate-200">
            Why Choose Storee
          </AnimateOnView>
          <AnimateOnView delay={0.1}>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-3">
              Everything You Need to <span className="gradient-text">Sell Online</span>
            </h2>
          </AnimateOnView>
          <AnimateOnView delay={0.2}>
            <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
              Storee combines AI power with enterprise-grade ecommerce tools in one beautiful platform
            </p>
          </AnimateOnView>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((adv, i) => (
            <AnimateOnView key={adv.title} delay={i * 0.08} y={24}>
              <Card className={`relative p-6 ${adv.border} card-hover group overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${adv.color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`} />
              <div className={`w-12 h-12 ${adv.bg} rounded-xl flex items-center justify-center mb-4`}>
                <div className={`bg-gradient-to-br ${adv.color} rounded-lg w-10 h-10 flex items-center justify-center`}>
                  <adv.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{adv.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{adv.description}</p>
              </Card>
            </AnimateOnView>
          ))}
        </div>
      </div>
    </section>
  );
}
