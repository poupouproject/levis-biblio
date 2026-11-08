'use client';

import { useState, useSyncExternalStore, type JSX } from 'react';
import { Link2, Loader2, Share2 } from 'lucide-react';
import { QrCode } from './QrCode';

/** Adresse commune à partager : chacun y voit sa propre année, après connexion. */
export const SHARE_PATH = '/mon-annee';

const noSubscribe = (): (() => void) => () => undefined;

function useOrigin(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => '',
  );
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Partage du bilan : une image produite à la demande (jamais stockée), envoyée par le menu de
 * partage du téléphone, ou enregistrée à défaut. Par défaut, elle ne montre que des chiffres ;
 * l'auteur et la série seulement si l'usager le choisit.
 */
export function ShareRecap({ year, demo }: { year: number; demo: boolean }): JSX.Element {
  const origin = useOrigin();
  const [withTitles, setWithTitles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const link = `${origin}${SHARE_PATH}`;
  const text = `Mon année ${String(year)} à la bibliothèque. Et la vôtre? ${link}`;

  const share = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      const params = new URLSearchParams({ annee: String(year) });
      if (withTitles) params.set('titres', '1');
      const response = await fetch(`/compte/mon-annee/partage?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(String(response.status));
      const file = new File([await response.blob()], `mon-annee-${String(year)}.png`, {
        type: 'image/png',
      });
      const data: ShareData = { files: [file], title: `Mon année ${String(year)}`, text };
      if ('canShare' in navigator && navigator.canShare(data)) {
        await navigator.share(data);
      } else {
        download(file);
        setStatus('Image enregistrée : ajoutez-la à votre story ou envoyez-la à vos amis.');
      }
    } catch (error) {
      // Partage annulé par l'usager : rien à signaler
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('Le partage n’a pas fonctionné. Réessayez dans un instant.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus('Lien copié.');
    } catch {
      setStatus(`Copiez ce lien : ${link}`);
    }
  };

  return (
    <section
      aria-labelledby="partage-titre"
      className="flex flex-col gap-3 rounded-2xl bg-white/10 p-4"
    >
      <h3 id="partage-titre" className="text-lg font-bold">
        Partagez votre année
      </h3>
      <label className="flex items-start gap-2 text-sm leading-snug">
        <input
          type="checkbox"
          checked={withTitles}
          onChange={(event) => {
            setWithTitles(event.target.checked);
          }}
          className="mt-0.5 h-4 w-4 accent-[#f0c987]"
        />
        <span>
          Montrer ma plume et ma série de l’année sur l’image
          <span className="block text-xs text-white/70">
            Sinon, l’image ne montre que des chiffres.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void share()}
          aria-disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f0c987] px-4 py-2.5 font-bold text-[#2f2f2f] hover:bg-[#fde2b8] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none aria-disabled:opacity-70"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Share2 className="h-5 w-5" aria-hidden />
          )}
          Partager mon année
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Link2 className="h-5 w-5" aria-hidden />
          Copier le lien
        </button>
      </div>
      <p role="status" className="min-h-[1.25rem] text-sm text-[#fde2b8]">
        {status}
      </p>
      {origin && (
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-2">
            <QrCode value={link} size={88} title={`Code QR vers ${link}`} />
          </div>
          <p className="text-xs leading-relaxed text-white/80">
            Vos amis scannent ce code ou ouvrent le lien : chacun y découvre <strong>sa</strong>{' '}
            propre année, après s’être connecté. Le lien ne contient aucune de vos données.
            {demo && ' En démonstration, ils voient le dossier fictif.'}
          </p>
        </div>
      )}
    </section>
  );
}
