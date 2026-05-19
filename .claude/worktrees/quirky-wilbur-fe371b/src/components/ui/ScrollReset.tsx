'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    // Disable browser's built-in scroll restoration so it doesn't
    // override our manual reset after Next.js navigation
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Use requestAnimationFrame to ensure scroll reset runs after
    // Next.js finishes rendering and restoring the new page
    const raf = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
