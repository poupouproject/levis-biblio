import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Library, MapPin, Search } from 'lucide-react';
import { AccountMenu } from '@/components/account/AccountMenu';
import { FeedbackButtons } from '@/components/ui/FeedbackButtons';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { Toaster } from '@/components/ui/Toaster';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LévisBiblio — Le catalogue des bibliothèques de Lévis',
  description:
    'Cherchez parmi les 160 000 documents des 10 bibliothèques de Lévis : séries réunies, suggestions, disponibilités.',
};

export const viewport: Viewport = {
  themeColor: '#d4a853',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    // suppressHydrationWarning : le script ci-dessous ajoute la classe `dark` avant React.
    <html lang="fr-CA" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${inter.className} flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-[#0f0f0f] dark:text-zinc-100`}
      >
        {/* En-tête (Header) simple et fixe */}
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-[#1a1a1a]/80">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-[#d4a853]">
              <Library className="h-5 w-5" />
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Lévis<span className="text-[#d4a853]">Biblio</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/recherche"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <Search className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Catalogue</span>
              </Link>
              <Link
                href="/bibliotheques"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <MapPin className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Bibliothèques</span>
              </Link>
              <AccountMenu />
            </div>
          </div>
        </header>

        {/* Contenu principal (qui va s'étirer) */}
        <main className="mx-auto w-full max-w-6xl flex-grow p-4 sm:p-6">{children}</main>
        <Toaster />

        {/* Pied de page (Footer) avec le disclaimer */}
        <footer className="mt-auto border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-[#1a1a1a]">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <div className="mb-4">
              <FeedbackButtons />
            </div>
            <div className="mb-4 flex justify-center">
              <ThemeSelector />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Projet citoyen open source
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Indépendant de la Ville de Lévis. Ce service agit comme une interface par-dessus les
              outils existants.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
