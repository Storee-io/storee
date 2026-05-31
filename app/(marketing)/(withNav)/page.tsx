import type { Metadata } from 'next';
import HeroSection from '@/src/components/home/HeroSection';
import TemplatesSection from '@/src/components/home/TemplatesSection';
import AdvantageGrid from '@/src/components/home/AdvantageGrid';
import DashboardPreview from '@/src/components/home/DashboardPreview';
import Testimonials from '@/src/components/home/Testimonials';
import FAQ from '@/src/components/home/FAQ';
import FinalCTA from '@/src/components/home/FinalCTA';

// ISR: rebuild every hour; content is static marketing copy
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Build Your Online Store with AI',
  description: 'Storee is an AI-powered e-commerce store builder. Describe your business and get a complete, ready-to-publish online store in seconds. No code needed.',
  openGraph: {
    title: 'Build Your Online Store with AI | Storee',
    description: 'AI-powered store builder. No code needed.',
    url: '/',
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TemplatesSection />
      <AdvantageGrid />
      <DashboardPreview />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}
