import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

/**
 * Adresses IPv4 de ce poste sur le réseau local. En mode dev, Next bloque les ressources
 * demandées depuis une autre origine que localhost : sans cette liste, tester depuis un
 * téléphone (http://<IP-du-PC>:3000) fait recharger chaque page au complet.
 * Sans effet en production.
 */
const lanAddresses = Object.values(networkInterfaces())
  .flatMap((list) => list ?? [])
  .filter((iface) => iface.family === 'IPv4' && !iface.internal)
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,

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
};

export default nextConfig;
