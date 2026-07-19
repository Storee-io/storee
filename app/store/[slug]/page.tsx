import { notFound } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import StorefrontClient from './StorefrontClient';
import StoreInactive from './StoreInactive';
import type { Store } from '@/src/context/StoreContext';

// ISR: revalidate every 60s so store updates appear quickly after re-publish
export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const db = createServerClient();
  const { data } = await db
    .from('published_stores')
    .select('name, status, branding')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!data) return { title: 'Store Not Found' };
  const icons = data.branding?.faviconUrl ? { icon: data.branding.faviconUrl } : undefined;
  if (data.status === 'inactive') return { title: `${data.name} – Currently Unavailable`, icons };
  return { title: data.name, icons };
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params;
  const db = createServerClient();

  // First try to find the store from published_stores to check if it's published
  const { data: publishedData } = await db
    .from('published_stores')
    .select('id, status')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!publishedData) notFound();
  if (publishedData.status === 'inactive') {
    // Get name from stores table for inactive message
    const { data: storeData } = await db
      .from('stores')
      .select('name')
      .eq('id', publishedData.id)
      .maybeSingle();
    return <StoreInactive name={storeData?.name ?? 'Store'} />;
  }

  // Get the actual store data from stores table (always up-to-date)
  const { data, error } = await db
    .from('stores')
    .select('*')
    .eq('id', publishedData.id)
    .maybeSingle();

  if (!data || error) notFound();

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
    branding: data.branding ?? undefined,
    paymentSettings: data.payment_settings ?? undefined,
    shippingSettings: data.shipping_settings ?? undefined,
    checkoutSettings: data.checkout_settings ?? undefined,
  };

  return <StorefrontClient store={store} />;
}
