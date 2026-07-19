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

  // Get store data from published_stores (which has all the published data)
  // and check if there's a matching record in stores table for latest updates
  const { data: publishedData, error: pubError } = await db
    .from('published_stores')
    .select('*')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!publishedData || pubError) notFound();
  if (publishedData.status === 'inactive') {
    return <StoreInactive name={publishedData.name} />;
  }

  // Try to get latest data from stores table using subdomain as reference
  // The stores table should have matching subdomain for published stores
  let storeData = publishedData;
  const { data: freshData } = await db
    .from('stores')
    .select('*')
    .eq('subdomain', slug)
    .maybeSingle();

  // Use fresh data from stores table if available (always up-to-date)
  if (freshData) {
    storeData = { ...publishedData, ...freshData };
  }

  const store: Store = {
    id: storeData.id,
    name: storeData.name,
    domain: `${slug}.storee.io`,
    status: 'Published',
    primaryColor: storeData.primary_color,
    createdAt: storeData.created_at,
    category: storeData.category,
    revenue: 0,
    orders: 0,
    design: storeData.design ?? undefined,
    currency: storeData.currency ?? undefined,
    language: storeData.language ?? undefined,
    font: storeData.font ?? undefined,
    mood: storeData.mood ?? undefined,
    audience: storeData.audience ?? undefined,
    branding: storeData.branding ?? undefined,
    paymentSettings: storeData.payment_settings ?? undefined,
    shippingSettings: storeData.shipping_settings ?? undefined,
    checkoutSettings: storeData.checkout_settings ?? undefined,
  };

  return <StorefrontClient store={store} />;
}
