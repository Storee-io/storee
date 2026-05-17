'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import type { PlanName } from '@/src/context/AuthContext';

const plans: {
  name: string;
  icon: React.ElementType;
  price: number;
  desc: string;
  color: string;
  features: string[];
  cta: string;
  ctaLink?: string;
  upgradePlan?: PlanName;
  highlight: boolean;
}[] = [
  {
    name: 'Free', icon: Sparkles, price: 0, desc: 'Perfect to get started',
    color: 'from-slate-500 to-slate-600',
    features: ['1 store', 'Up to 10 products', 'Storee subdomain', 'Basic analytics', 'Email support', 'SSL certificate'],
    cta: 'Get Started Free', ctaLink: '/register', highlight: false,
  },
  {
    name: 'Starter', icon: Zap, price: 19, desc: 'For growing businesses',
    color: 'from-emerald-500 to-teal-500',
    features: ['3 stores', 'Unlimited products', 'Custom domain', 'Advanced analytics', 'Priority support', 'Remove Storee branding', 'Abandoned cart recovery', 'Custom checkout'],
    cta: 'Start 14-day Trial', upgradePlan: 'Starter', highlight: true,
  },
  {
    name: 'Pro', icon: Crown, price: 49, desc: 'For serious entrepreneurs',
    color: 'from-purple-500 to-pink-500',
    features: ['Unlimited stores', 'Unlimited products', 'Multiple custom domains', 'Advanced reporting', '24/7 priority support', 'White-label option', 'API access', 'Team collaboration', 'Custom integrations'],
    cta: 'Get Pro', upgradePlan: 'Pro', highlight: false,
  },
];

export default function PricingClient() {
  const { openUpgradeModal } = useAuth();

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-slate-900 tracking-tight mb-4"
          >
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            Start free, scale as you grow. No hidden fees.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-white rounded-3xl p-8 border-2 transition-all ${plan.highlight ? 'border-emerald-400 shadow-2xl shadow-emerald-100 scale-105' : 'border-slate-200 shadow-sm hover:shadow-lg'}`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 gradient-bg text-white text-xs font-bold rounded-full shadow-lg">Most Popular</span>
                </div>
              )}
              <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center mb-4 shadow-md`}>
                <plan.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
              <p className="text-slate-500 text-sm mb-4">{plan.desc}</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                <span className="text-slate-400 mb-1.5">/month</span>
              </div>

              {plan.ctaLink ? (
                <Link
                  href={plan.ctaLink}
                  className={`block w-full py-3 text-center font-semibold rounded-2xl transition-all mb-6 bg-slate-100 text-slate-700 hover:bg-slate-200`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={() => openUpgradeModal(plan.upgradePlan!)}
                  className={`w-full py-3 text-center font-semibold rounded-2xl transition-all mb-6 ${
                    plan.highlight
                      ? 'gradient-bg text-white hover:opacity-90 shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </button>
              )}

              <div className="space-y-3">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-500 text-sm">All plans include SSL, free migrations, and 99.9% uptime SLA</p>
        </div>
      </div>
    </div>
  );
}
