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
      {
        // Couvertures servies par le portail des bibliothèques (non protégées par Cloudflare)
        protocol: 'https',
        hostname: 'levi.ent.sirsidynix.net',
        pathname: '/client/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  headers() {
    return Promise.resolve([
      {
        // Données personnelles : jamais en cache partagé, jamais indexées, jamais encadrées
        source: '/compte/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ]);
  },

  rewrites() {
    return [
      {
        source: '/api/proxy/sirsidynix/:path*',
        destination: 'https://levis.sirsidynix.net/:path*',
      },
    ];
  },
};

export default nextConfig;
