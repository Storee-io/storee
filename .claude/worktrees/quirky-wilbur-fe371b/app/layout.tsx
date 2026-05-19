import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/src/context/AuthContext';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import ScrollReset from '@/src/components/ui/ScrollReset';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'https://storee.app'),
  title: {
    default: 'Storee – AI-Powered Store Builder',
    template: '%s | Storee',
  },
  description: 'Build your online store with AI. Describe your business and get a complete, ready-to-publish store in seconds.',
  openGraph: {
    type: 'website',
    siteName: 'Storee',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@storeeapp',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <AuthProvider>
          <ScrollReset />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
