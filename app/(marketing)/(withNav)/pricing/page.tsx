import type { Metadata } from 'next';
import PricingClient from './PricingClient';

// ISR: rebuild every hour; pricing content rarely changes
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for every business. Start for free and upgrade anytime. No hidden fees.',
};

export default function PricingPage() {
  return <PricingClient />;
}
