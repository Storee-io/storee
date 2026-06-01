import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/canvas',          destination: '/editor',          permanent: true },
      { source: '/canvas/:storeId', destination: '/editor/:storeId', permanent: true },
    ];
  },
};

export default nextConfig;
