import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Library, MapPin } from 'lucide-react';
import { AccountMenu } from '@/components/account/AccountMenu';
import { FloatingSearchProvider, HeaderSearchButton } from '@/components/search/FloatingSearch';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { Toaster } from '@/components/ui/Toaster';
import { isDemoBadgeVisible } from '@/lib/account/demo';
import { RECHERCHES_POPULAIRES } from '@/lib/catalog/curation';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LévisBiblio — Le catalogue des bibliothèques de Lévis',
  description:
    'Cherchez parmi les 160 000 documents des 10 bibliothèques de Lévis : séries réunies, suggestions, disponibilités.',
};

export const viewport: Viewport = {
  themeColor: '#d4a853',
  // Le clavier mobile réduit la page (et `dvh`) au lieu de la recouvrir : les suggestions de
  // recherche se limitent ainsi à la partie visible. iOS Safari l'ignore : SearchBox suit
  // alors le visualViewport.
  interactiveWidget: 'resizes-content',
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
        <FloatingSearchProvider popular={RECHERCHES_POPULAIRES}>
          {/* En-tête (Header) simple et fixe */}
          <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-[#1a1a1a]/80">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Link href="/" className="flex min-w-0 items-center gap-2 text-[#d4a853]">
                  <Library className="h-5 w-5 shrink-0" />
                  <span className="truncate text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Lévis<span className="text-[#d4a853]">Biblio</span>
                  </span>
                </Link>
                <span className="shrink-0 rounded-full border border-[#d4a853]/60 bg-[#d4a853]/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-amber-800 uppercase dark:text-[#d4a853]">
                  Bêta
                </span>
                {/* Lu au rendu du serveur : sur Vercel, la variable est fixée au déploiement. */}
                {isDemoBadgeVisible() && <DemoBadge />}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <HeaderSearchButton />
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
        </FloatingSearchProvider>
        <Toaster />

        {/* Pied de page (Footer) avec le disclaimer */}
        <footer className="mt-auto border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-[#1a1a1a]">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
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
            <p className="mt-3 text-xs">
              <Link
                href="/confidentialite"
                className="text-zinc-600 underline underline-offset-2 hover:text-[#8a6a2c] dark:text-zinc-400 dark:hover:text-[#d4a853]"
              >
                Confidentialité
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
