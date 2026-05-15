import { StoreProvider } from '@/src/context/StoreContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      {children}
    </StoreProvider>
  );
}
