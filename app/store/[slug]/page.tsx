import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import StoreContent from './StoreContent';
import StoreSkeleton from './StoreSkeleton';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const db = createServerClient();
  const { data } = await db
    .from('published_stores')
    .select('name, status')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!data) return { title: 'Store Not Found' };
  if (data.status === 'inactive') return { title: `${data.name} – Currently Unavailable` };
  return { title: data.name };
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params;
  const db = createServerClient();

  // Fast minimal fetch — just name + primaryColor for the branded skeleton
  const { data: minimal } = await db
    .from('published_stores')
    .select('name, primary_color, status')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!minimal) notFound();

  // Full content streams in via Suspense while skeleton shows
  return (
    <Suspense
      fallback={
        <StoreSkeleton
          primaryColor={minimal.primary_color ?? '#10b981'}
          name={minimal.name}
        />
      }
    >
      <StoreContent slug={slug} />
    </Suspense>
  );
}
