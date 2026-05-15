import type { Metadata } from 'next';
import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';
import TemplatesListClient from './TemplatesListClient';

export const metadata: Metadata = {
  title: 'Store Templates',
  description: 'Browse professionally designed e-commerce store templates. Pick one and customize it with AI in seconds.',
};

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <TemplatesListClient />
      <Footer />
    </div>
  );
}
