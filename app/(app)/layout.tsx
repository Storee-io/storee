import { StoreProvider } from '@/src/context/StoreContext';
import { CartProvider } from '@/src/context/CartContext';
import { WishlistProvider } from '@/src/context/WishlistContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <CartProvider>
        <WishlistProvider>
          {children}
        </WishlistProvider>
      </CartProvider>
    </StoreProvider>
  );
}
