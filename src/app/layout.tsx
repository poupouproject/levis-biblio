import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Library } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LévisBiblio Mobile',
  description: 'Catalogue unifié des bibliothèques de Lévis — mobile-first',
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
    <html lang="fr-CA" className="antialiased">
      <body className={`${inter.className} min-h-screen bg-zinc-50 dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 flex flex-col`}>
        
        {/* En-tête (Header) simple et fixe */}
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
            <div className="flex items-center gap-2 text-[#d4a853]">
              <Library className="h-5 w-5" />
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Lévis<span className="text-[#d4a853]">Biblio</span>
              </span>
            </div>
          </div>
        </header>

        {/* Contenu principal (qui va s'étirer) */}
        <main className="flex-grow mx-auto w-full max-w-3xl p-4 sm:p-6">
          {children}
        </main>

        {/* Pied de page (Footer) avec le disclaimer */}
        <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a1a] py-6">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Projet citoyen open source
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Indépendant de la Ville de Lévis. Ce service agit comme une interface par-dessus les outils existants.
            </p>
          </div>
        </footer>

      </body>
    </html>
  );
}