import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LévisBiblio',
  description: 'Catalogue des bibliothèques de Lévis — mobile-first',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="fr-CA">
      <body className="antialiased">{children}</body>
    </html>
  );
}
