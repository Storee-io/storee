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
  const { data } = await db
    .from('published_stores')
    .select('name, status, branding, design, currency')
    .eq('subdomain', slug)
    .maybeSingle();

  if (!data) return { title: 'Store Not Found' };
  const icons = data.branding?.faviconUrl ? { icon: data.branding.faviconUrl } : undefined;
  if (data.status === 'inactive') return { title: `${data.name} – Currently Unavailable`, icons };

  // Per-product metadata (title, description, OG image) for /product/<slug> deep links —
  // otherwise every product page would share the generic store-name title, which is bad
  // for SEO and for link previews shared on social/chat apps.
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

  const initialPath = '/' + path.join('/');

  return <StorefrontClient store={store} initialPath={initialPath} />;
}
