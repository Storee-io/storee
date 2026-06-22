import { StoreProvider } from '@/src/context/StoreContext';
import { ProductProvider } from '@/src/context/ProductContext';
import { OrderProvider } from '@/src/context/OrderContext';
import { CartProvider } from '@/src/context/CartContext';
import { WishlistProvider } from '@/src/context/WishlistContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
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
