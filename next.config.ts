import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        pathname: '/b/**',
      },
      {
        protocol: 'https',
        hostname: '*.cantookstation.com',
        pathname: '/assets/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  rewrites() {
    return Promise.resolve([
      {
        source: '/api/proxy/sirsidynix/:path*',
        destination: 'https://levis.sirsidynix.net/:path*',
      },
    ]);
  },
};

export default nextConfig;
