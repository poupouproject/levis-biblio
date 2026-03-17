import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Footer } from '@/components/ui/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'LévisBiblio',
  description: 'Catalogue des bibliothèques de Lévis — mobile-first',
  applicationName: 'LévisBiblio',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LévisBiblio',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="fr-CA" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
