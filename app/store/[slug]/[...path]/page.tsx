import { notFound } from 'next/navigation';
import { createServerClient } from '@/src/lib/supabase';
import StorefrontClient from '../StorefrontClient';
import StoreInactive from '../StoreInactive';
import type { Store } from '@/src/context/StoreContext';
import type { RichProduct } from '@/src/lib/claudeApi';
import { formatPrice } from '@/src/lib/formatCurrency';

// ISR: revalidate every 60s so store updates appear quickly after re-publish
export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string; path: string[] }>;
}

const productSlugify = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export async function generateMetadata({ params }: Props) {
  const { slug, path } = await params;
  const db = createServerClient();

  // Check if store is published
  const { data: publishedData } = await db
    .from('published_stores')
    .select('id, status')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!publishedData) return { title: 'Store Not Found' };
  if (publishedData.status === 'inactive') return { title: `Store – Currently Unavailable` };

  // Get store data from stores table (always up-to-date)
  const { data } = await db
    .from('stores')
    .select('name, branding, design, currency')
    .eq('id', publishedData.id)
    .maybeSingle();

  if (!data) return { title: 'Store Not Found' };
  const icons = data.branding?.faviconUrl ? { icon: data.branding.faviconUrl } : undefined;

  // Per-product metadata (title, description, OG image) for /product/<slug> deep links
  const productMatch = path?.[0] === 'product' && path[1];
  if (productMatch) {
    const products = (data.design?.products ?? []) as RichProduct[];
    const product = products.find(p => productSlugify(p.name) === path[1]);
    if (product) {
      const price = formatPrice(product.price, data.currency?.code);
      const title = `${product.name} – ${price} | ${data.name}`;
      const description = product.description || `Buy ${product.name} at ${data.name}.`;
      return {
        title,
        description,
        icons,
        openGraph: { title, description, images: product.image ? [product.image] : undefined },
        twitter: { card: 'summary_large_image', title, description, images: product.image ? [product.image] : undefined },
      };
    }
  }

  return { title: data.name, icons };
}

export default async function StorefrontPathPage({ params }: Props) {
  const { slug, path } = await params;
  const db = createServerClient();

  // First check if store is published
  const { data: publishedData } = await db
    .from('published_stores')
    .select('id, status')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!publishedData) notFound();
  if (publishedData.status === 'inactive') {
    const { data: storeData } = await db
      .from('stores')
      .select('name')
      .eq('id', publishedData.id)
      .maybeSingle();
    return <StoreInactive name={storeData?.name ?? 'Store'} />;
  }

  // Get store data from stores table (always up-to-date)
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

  const initialPath = '/' + path.join('/');

  return <StorefrontClient store={store} initialPath={initialPath} />;
}
