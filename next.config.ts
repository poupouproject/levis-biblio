import { withSentryConfig } from '@sentry/nextjs/config';
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

  // Environnement Sentry (production, preview…) lisible aussi dans le navigateur.
  env: { NEXT_PUBLIC_SENTRY_ENV: process.env.VERCEL_ENV ?? process.env.NODE_ENV },

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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'nexvio',

  project: 'levis-biblio',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
