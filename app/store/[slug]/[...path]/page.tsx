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

  // Get store data from published_stores and try to get latest from stores
  const { data: publishedData } = await db
    .from('published_stores')
    .select('name, status, branding, design, currency')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!publishedData) return { title: 'Store Not Found' };
  if (publishedData.status === 'inactive') return { title: `${publishedData.name} – Currently Unavailable` };

  // Try to get latest data from stores table for always up-to-date info
  const { data: freshData } = await db
    .from('stores')
    .select('name, branding, design, currency')
    .eq('subdomain', slug)
    .maybeSingle();

  const data = freshData ?? publishedData;
  const icons = data.branding?.faviconUrl ? { icon: data.branding.faviconUrl } : undefined;

  // Per-product metadata for /product/<slug> deep links
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

  // Get store data from published_stores and try to get latest from stores table
  const { data: publishedData, error: pubError } = await db
    .from('published_stores')
    .select('*')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!publishedData || pubError) notFound();
  if (publishedData.status === 'inactive') {
    return <StoreInactive name={publishedData.name} />;
  }

  // Try to get latest data from stores table using subdomain
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

  const initialPath = '/' + path.join('/');

  return <StorefrontClient store={store} initialPath={initialPath} />;
}
