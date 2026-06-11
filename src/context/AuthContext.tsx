'use client';

import { createContext, useContext, useState, useEffect, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const UpgradeModal = lazy(() => import('../components/shared/UpgradeModal'));

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAnonymous?: boolean;
}

export type PlanName = 'Starter' | 'Pro';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  // Upgrade modal
  upgradeModalOpen: boolean;
  upgradePlan: PlanName;
  openUpgradeModal: (plan?: PlanName) => void;
  closeUpgradeModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function supabaseUserToLocal(sbUser: {
  id: string;
  email?: string;
  is_anonymous?: boolean;
  user_metadata?: { name?: string; full_name?: string };
}): User {
  const meta = sbUser.user_metadata ?? {};
  const isAnonymous = sbUser.is_anonymous ?? false;
  return {
    id: sbUser.id,
    name: isAnonymous ? 'Guest' : (meta.name ?? meta.full_name ?? (sbUser.email?.split('@')[0] ?? 'User')),
    email: sbUser.email ?? '',
    isAnonymous,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<PlanName>('Starter');

  useEffect(() => {
    // Restore existing session or sign in anonymously
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(supabaseUserToLocal(session.user));
        } else {
          // No session — sign in anonymously so stores can be persisted
          await signInAnonymouslySafe();
        }
      } catch {
        // Network error restoring session (e.g. Supabase unreachable, stale
        // refresh token) — clear stale token and fall back to anonymous.
        try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
        await signInAnonymouslySafe();
      } finally {
        setIsLoading(false);
      }
    })();

    // Listen for sign-in / sign-out / token-refresh events
    // Wrap in silent error handler — token refresh failures are non-critical (session persists via localStorage)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        setUser(session?.user ? supabaseUserToLocal(session.user) : null);
      } catch {
        // Ignore state update errors (stale component unmount, etc)
      }
    });

    return () => {
      try {
        subscription.unsubscribe();
      } catch {
        // Ignore unsubscribe errors
      }
    };
  }, []);

  // Silently sign in anonymously — if anonymous auth is disabled, fall back gracefully
  async function signInAnonymouslySafe() {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        // Anonymous auth not enabled — continue without a session (stores go to localStorage)
        console.warn('[auth] Anonymous sign-in unavailable:', error.message);
      }
    } catch {
      // Ignore — non-critical path
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    setIsLoading(false);
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    // If current user is anonymous, upgrade their account instead of creating a new one
    const { data: { user: current } } = await supabase.auth.getUser();
    if (current?.is_anonymous) {
      // Link email+password to the existing anonymous account (preserves their stores)
      const { error } = await supabase.auth.updateUser({
        email,
        password,
        data: { name },
      });
      if (error) {
        setIsLoading(false);
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setIsLoading(false);
        throw new Error(error.message);
      }
    }
    setIsLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Re-create an anonymous session after logout
    await signInAnonymouslySafe();
  };

  const openUpgradeModal = (plan: PlanName = 'Starter') => {
    setUpgradePlan(plan);
    setUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => setUpgradeModalOpen(false);

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, isLoading,
      upgradeModalOpen, upgradePlan, openUpgradeModal, closeUpgradeModal,
    }}>
      {children}
      <Suspense fallback={null}>
        <UpgradeModal />
      </Suspense>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
