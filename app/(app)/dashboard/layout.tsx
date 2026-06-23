'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/src/components/dashboard/Sidebar';
import DashboardHeader from '@/src/components/dashboard/DashboardHeader';
import { DashboardContentLoader } from '@/src/components/dashboard/DashboardContentLoader';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader onMenuClick={() => setMobileOpen(true)} />
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              <DashboardContentLoader>
                {children}
              </DashboardContentLoader>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
