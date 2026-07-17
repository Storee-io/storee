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
    branding: data.branding ?? undefined,
    paymentSettings: data.payment_settings ?? undefined,
    shippingSettings: data.shipping_settings ?? undefined,
    checkoutSettings: data.checkout_settings ?? undefined,
  };

  return <StorefrontClient store={store} />;
}
