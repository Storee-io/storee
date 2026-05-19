'use client';

import { createContext, useContext, useState, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

const UpgradeModal = lazy(() => import('../components/shared/UpgradeModal'));

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('storee_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<PlanName>('Starter');

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    const u: User = { id: '1', name: email.split('@')[0], email };
    setUser(u);
    localStorage.setItem('storee_user', JSON.stringify(u));
    setIsLoading(false);
  };

  const register = async (name: string, email: string, _password: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    const u: User = { id: '1', name, email };
    setUser(u);
    localStorage.setItem('storee_user', JSON.stringify(u));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('storee_user');
  };

  const openUpgradeModal = (plan: PlanName = 'Starter') => {
    setUpgradePlan(plan);
    setUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => setUpgradeModalOpen(false);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, upgradeModalOpen, upgradePlan, openUpgradeModal, closeUpgradeModal }}>
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
