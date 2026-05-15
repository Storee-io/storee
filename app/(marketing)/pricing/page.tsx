import type { Metadata } from 'next';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for every business. Start for free and upgrade anytime. No hidden fees.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PricingClient />
      <Footer />
    </div>
  );
}
