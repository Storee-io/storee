import type { Metadata } from 'next';
import { templates } from '@/src/data/templates';
import TemplatePreviewClient from './TemplatePreviewClient';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const template = templates.find(t => t.id === id);
  return {
    title: template ? `${template.name} Template` : 'Template Not Found',
    description: template?.description,
    robots: { index: false, follow: false },
  };
}

export default async function TemplatePreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { from = '/templates' } = await searchParams;
  return <TemplatePreviewClient id={id} from={from} />;
}
