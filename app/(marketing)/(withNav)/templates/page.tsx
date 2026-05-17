import type { Metadata } from 'next';
import TemplatesListClient from './TemplatesListClient';

export const metadata: Metadata = {
  title: 'Store Templates',
  description: 'Browse professionally designed e-commerce store templates. Pick one and customize it with AI in seconds.',
};

export default function TemplatesPage() {
  return <TemplatesListClient />;
}
