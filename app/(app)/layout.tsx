import { cookies } from 'next/headers';
import { StoreProvider } from '@/src/context/StoreContext';
import type { Store } from '@/src/context/StoreContext';
import { ProductProvider } from '@/src/context/ProductContext';
import { OrderProvider } from '@/src/context/OrderContext';
import { CartProvider } from '@/src/context/CartContext';
import { WishlistProvider } from '@/src/context/WishlistContext';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Read the active store the client mirrored into a cookie so SSR renders the
  // correct store immediately (no header flicker on refresh).
  let initialActiveStore: Store | undefined;
  try {
    const raw = (await cookies()).get('storee_active_store')?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (parsed?.id && parsed?.name) initialActiveStore = parsed as Store;
    }
  } catch { /* malformed cookie — fall back to client localStorage */ }

  return (
    <StoreProvider initialActiveStore={initialActiveStore}>
      <ProductProvider>
        <OrderProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
            </WishlistProvider>
          </CartProvider>
        </OrderProvider>
      </ProductProvider>
    </StoreProvider>
  );
}
