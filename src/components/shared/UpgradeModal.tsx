'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, Crown, Check, CreditCard, Lock, Sparkles,
  ChevronRight, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { PlanName } from '../../context/AuthContext';

/* ─── Plan data ─────────────────────────────────────────── */
const PLANS: {
  name: PlanName;
  icon: React.ElementType;
  monthlyPrice: number;
  color: string;
  gradient: string;
  badge?: string;
  features: string[];
}[] = [
  {
    name: 'Starter',
    icon: Zap,
    monthlyPrice: 19,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    badge: 'Most Popular',
    features: [
      '3 stores',
      'Unlimited products',
      'Custom domain',
      'Advanced analytics',
      'Priority support',
      'Remove Storee branding',
      'Abandoned cart recovery',
    ],
  },
  {
    name: 'Pro',
    icon: Crown,
    monthlyPrice: 49,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    features: [
      'Unlimited stores',
      'Multiple custom domains',
      'Advanced reporting',
      '24/7 priority support',
      'White-label option',
      'API access',
      'Team collaboration',
      'Custom integrations',
    ],
  },
];

/* ─── Helpers ────────────────────────────────────────────── */
function formatCard(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return digits;
}

/* ─── Component ──────────────────────────────────────────── */
export default function UpgradeModal() {
  const { upgradeModalOpen, upgradePlan, closeUpgradeModal, openUpgradeModal } = useAuth();

  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [activePlan, setActivePlan] = useState<PlanName>(upgradePlan);
  const [step, setStep] = useState<'plan' | 'payment' | 'success'>('plan');

  // Payment form
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync plan when modal opens
  useEffect(() => {
    if (upgradeModalOpen) {
      setActivePlan(upgradePlan);
      setStep('plan');
      setCardNum(''); setExpiry(''); setCvc(''); setCardName('');
      setErrors({});
    }
  }, [upgradeModalOpen, upgradePlan]);

  const plan = PLANS.find(p => p.name === activePlan) ?? PLANS[0];
  const discount = billing === 'annual' ? 0.8 : 1;
  const price = Math.round(plan.monthlyPrice * discount);
  const annualTotal = Math.round(plan.monthlyPrice * 12 * discount);

  /* Validation */
  function validate() {
    const e: Record<string, string> = {};
    if (cardNum.replace(/\s/g, '').length < 16) e.cardNum = 'Enter a valid 16-digit card number';
    const [mm] = expiry.split(' / ');
    if (!mm || Number(mm) < 1 || Number(mm) > 12 || expiry.replace(/\D/g, '').length < 4) e.expiry = 'Enter a valid expiry date';
    if (cvc.length < 3) e.cvc = 'Enter a valid CVC';
    if (!cardName.trim()) e.cardName = 'Enter the name on your card';
    return e;
  }

  async function handlePay() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    setProcessing(false);
    setStep('success');
  }

  return (
    <AnimatePresence>
      {upgradeModalOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === overlayRef.current) closeUpgradeModal(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close */}
            <button
              onClick={closeUpgradeModal}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── Success step ── */}
            {step === 'success' && (
              <div className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}
                >
                  <BadgeCheck className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">You're on {plan.name}!</h2>
                <p className="text-slate-500 mb-2">
                  Your subscription is active. Enjoy all {plan.name} features.
                </p>
                <p className="text-xs text-slate-400 mb-8">
                  A confirmation receipt has been sent to your email.
                </p>
                <button
                  onClick={closeUpgradeModal}
                  className={`px-8 py-3 bg-gradient-to-r ${plan.gradient} text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity shadow-lg`}
                >
                  Start Exploring
                </button>
              </div>
            )}

            {/* ── Plan step ── */}
            {step === 'plan' && (
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Upgrade your plan</h2>
                    <p className="text-sm text-slate-500">Scale your store with powerful features</p>
                  </div>
                </div>

                {/* Billing toggle */}
                <div className="flex items-center justify-center mb-6">
                  <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                    <button
                      onClick={() => setBilling('monthly')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        billing === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBilling('annual')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        billing === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Annual
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">-20%</span>
                    </button>
                  </div>
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {PLANS.map(p => {
                    const pPrice = Math.round(p.monthlyPrice * discount);
                    const isActive = activePlan === p.name;
                    return (
                      <button
                        key={p.name}
                        onClick={() => setActivePlan(p.name)}
                        className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                          isActive
                            ? p.color === 'emerald'
                              ? 'border-emerald-400 bg-emerald-50/50'
                              : 'border-purple-400 bg-purple-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {p.badge && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 gradient-bg text-white text-xs font-bold rounded-full shadow">
                            {p.badge}
                          </span>
                        )}
                        <div className={`w-9 h-9 bg-gradient-to-br ${p.gradient} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                          <p.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex items-end gap-1 mb-1">
                          <span className="text-2xl font-bold text-slate-900">${pPrice}</span>
                          <span className="text-slate-400 text-xs mb-0.5">/mo</span>
                        </div>
                        {billing === 'annual' && (
                          <p className="text-xs text-emerald-600 font-medium mb-1">
                            ${Math.round(p.monthlyPrice * 12 * discount)}/yr
                          </p>
                        )}
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                        <div className="mt-3 space-y-1.5">
                          {p.features.slice(0, 4).map(f => (
                            <div key={f} className="flex items-center gap-1.5">
                              <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center flex-shrink-0`}>
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                              <span className="text-xs text-slate-600">{f}</span>
                            </div>
                          ))}
                          {p.features.length > 4 && (
                            <p className="text-xs text-slate-400 pl-5">+{p.features.length - 4} more</p>
                          )}
                        </div>
                        {isActive && (
                          <div className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep('payment')}
                  className={`w-full py-3.5 bg-gradient-to-r ${plan.gradient} text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2`}
                >
                  Continue to Payment
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  14-day free trial · Cancel anytime · No hidden fees
                </p>
              </div>
            )}

            {/* ── Payment step ── */}
            {step === 'payment' && (
              <div className="p-8">
                {/* Back + header */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setStep('plan')}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Payment details</h2>
                    <p className="text-sm text-slate-500">Your card will not be charged during the trial</p>
                  </div>
                </div>

                {/* Order summary */}
                <div className={`rounded-2xl p-4 mb-6 bg-gradient-to-r ${plan.gradient} text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <plan.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{plan.name} Plan</p>
                        <p className="text-xs text-white/80">{billing === 'annual' ? 'Billed annually' : 'Billed monthly'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${billing === 'annual' ? annualTotal : price}</p>
                      <p className="text-xs text-white/80">/{billing === 'annual' ? 'year' : 'month'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-xs text-white/80">14-day free trial — no charge today</span>
                  </div>
                </div>

                {/* Card form */}
                <div className="space-y-4">
                  {/* Card number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Card number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={cardNum}
                        onChange={e => {
                          setCardNum(formatCard(e.target.value));
                          if (errors.cardNum) setErrors(p => ({ ...p, cardNum: '' }));
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                          errors.cardNum ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white focus:border-emerald-400'
                        }`}
                      />
                    </div>
                    {errors.cardNum && <p className="text-xs text-red-500 mt-1">{errors.cardNum}</p>}
                  </div>

                  {/* Expiry + CVC */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expiry date</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM / YY"
                        value={expiry}
                        onChange={e => {
                          setExpiry(formatExpiry(e.target.value));
                          if (errors.expiry) setErrors(p => ({ ...p, expiry: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                          errors.expiry ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white focus:border-emerald-400'
                        }`}
                      />
                      {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CVC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="123"
                        maxLength={4}
                        value={cvc}
                        onChange={e => {
                          setCvc(e.target.value.replace(/\D/g, '').slice(0, 4));
                          if (errors.cvc) setErrors(p => ({ ...p, cvc: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                          errors.cvc ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white focus:border-emerald-400'
                        }`}
                      />
                      {errors.cvc && <p className="text-xs text-red-500 mt-1">{errors.cvc}</p>}
                    </div>
                  </div>

                  {/* Name on card */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name on card</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={e => {
                        setCardName(e.target.value);
                        if (errors.cardName) setErrors(p => ({ ...p, cardName: '' }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                        errors.cardName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white focus:border-emerald-400'
                      }`}
                    />
                    {errors.cardName && <p className="text-xs text-red-500 mt-1">{errors.cardName}</p>}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handlePay}
                  disabled={processing}
                  className={`mt-6 w-full py-3.5 bg-gradient-to-r ${plan.gradient} text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2 disabled:opacity-60`}
                >
                  {processing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Start 14-day Free Trial
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  256-bit SSL · Powered by Stripe · Cancel anytime
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
