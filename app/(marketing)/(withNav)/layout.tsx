import Navbar from '@/src/components/layout/Navbar';
import Footer from '@/src/components/layout/Footer';

export default function WithNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
