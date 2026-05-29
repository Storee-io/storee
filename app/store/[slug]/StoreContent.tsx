import { notFound } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import StorefrontClient from './StorefrontClient';
import StoreInactive from './StoreInactive';
import type { Store } from '@/src/context/StoreContext';

/**
 * Async server component — fetches the full store data and renders the storefront.
 * Wrapped in <Suspense> by page.tsx so the skeleton shows while this resolves.
 */
export default async function StoreContent({ slug }: { slug: string }) {
  const db = createServerClient();

  const { data, error } = await db
    .from('published_stores')
    .select('*')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!data || error) notFound();

  if (data.status === 'inactive') {
    return <StoreInactive name={data.name} />;
  }

  const store: Store = {
    id: data.id,
    name: data.name,
    domain: `${slug}.storee.io`,
    status: 'Published',
    primaryColor: data.primary_color,
    createdAt: data.created_at,
    category: data.category,
    revenue: 0,
    orders: 0,
    design: data.design ?? undefined,
    currency: data.currency ?? undefined,
    language: data.language ?? undefined,
    font: data.font ?? undefined,
    mood: data.mood ?? undefined,
    audience: data.audience ?? undefined,
  };

  return <StorefrontClient store={store} />;
}
