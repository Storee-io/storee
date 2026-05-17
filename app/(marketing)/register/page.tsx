'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/src/context/AuthContext';

const perks = [
  'AI-powered store generation',
  'Unlimited products',
  'Built-in analytics',
  'Free custom subdomain',
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(name, email, password);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyan-100 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center"
      >
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex mb-8">
            <Image
              src="/logo-dark.png"
              alt="Storee"
              width={126}
              height={36}
              unoptimized
              className="h-9 w-auto"
              priority
            />
          </Link>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Start selling online<br />
            <span className="gradient-text">in minutes</span>
          </h2>
          <p className="text-slate-500 mb-8">Create your AI-powered store for free. No credit card required.</p>
          <div className="space-y-3">
            {perks.map(perk => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-slate-700 font-medium">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-center lg:text-left mb-6 lg:hidden">
            <Link href="/" className="inline-flex">
              <Image
                src="/logo-dark.png"
                alt="Storee"
                width={126}
                height={36}
                unoptimized
              className="h-9 w-auto"
              />
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Create your account</h1>
            <p className="text-sm text-slate-500 mb-6">Free forever · No credit card needed</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create Free Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-4">
              By signing up you agree to our{' '}
              <a href="#" className="text-emerald-600 hover:underline">Terms</a>{' '}
              and{' '}
              <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
            </p>

            <p className="text-center text-sm text-slate-500 mt-5">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
