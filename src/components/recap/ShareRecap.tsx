'use client';

import { useEffect, useState, useSyncExternalStore, type JSX } from 'react';
import Image from 'next/image';
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

interface Preview {
  /** Année et choix « plume et série » de l'image. */
  key: string;
  file: File;
  url: string;
}

/**
 * Partage du bilan : l'image exacte qui sera envoyée, en aperçu, puis le menu de partage du
 * téléphone (ou l'enregistrement à défaut). Produite à la demande, jamais stockée : elle vit
 * en mémoire dans l'onglet le temps de l'écran. Par défaut, elle ne montre que des chiffres ;
 * l'auteur et la série seulement si l'usager le choisit.
 */
export function ShareRecap({ year, demo }: { year: number; demo: boolean }): JSX.Element {
  const origin = useOrigin();
  const [withTitles, setWithTitles] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const link = `${origin}${SHARE_PATH}`;
  const text = `Mon année ${String(year)} à la bibliothèque. Et la vôtre? ${link}`;
  const key = `${String(year)}-${withTitles ? 'titres' : 'chiffres'}`;
  const ready = preview?.key === key;
  const loading = !ready && failed !== key;

  // L'image est préparée dès l'arrivée sur l'écran : l'aperçu montre ce qui partira, et le
  // partage se fait dans le geste même (Safari refuse un partage lancé après un long chargement)
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ annee: String(year) });
    if (withTitles) params.set('titres', '1');
    fetch(`/compte/mon-annee/partage?${params.toString()}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        if (cancelled) return;
        const file = new File([blob], `mon-annee-${String(year)}.png`, { type: 'image/png' });
        setPreview({ key, file, url: URL.createObjectURL(file) });
      })
      .catch(() => {
        if (!cancelled) setFailed(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key, year, withTitles, attempt]);

  // L'image remplacée (ou quittée) est libérée
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  const share = async (): Promise<void> => {
    if (!ready) return;
    setStatus(null);
    const data: ShareData = { files: [preview.file], title: `Mon année ${String(year)}`, text };
    try {
      if ('canShare' in navigator && navigator.canShare(data)) {
        await navigator.share(data);
      } else {
        download(preview.file);
        setStatus('Image enregistrée : ajoutez-la à votre story ou envoyez-la à vos amis.');
      }
    } catch (error) {
      // Partage annulé par l'usager : rien à signaler
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('Le partage n’a pas fonctionné. Réessayez dans un instant.');
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
      <figure className="mx-auto w-full max-w-[14rem]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-white/10 shadow-2xl ring-1 ring-white/25">
          {preview && (
            <Image
              src={preview.url}
              alt="Aperçu de l’image à partager"
              fill
              unoptimized
              sizes="14rem"
              className={`object-cover transition-opacity duration-300 ${ready ? '' : 'opacity-40'}`}
            />
          )}
          {loading && (
            <Loader2
              className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin"
              aria-hidden
            />
          )}
          {failed === key && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm">
              <p>Aperçu indisponible.</p>
              <button
                type="button"
                onClick={() => {
                  setFailed(null);
                  setAttempt((n) => n + 1);
                }}
                className="rounded-lg border border-white/40 px-3 py-1.5 font-semibold hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
        <figcaption className="mt-2 text-center text-xs text-white/75">
          {loading ? 'Préparation de votre image…' : 'L’image qui sera envoyée'}
        </figcaption>
      </figure>
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
          aria-disabled={!ready}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f0c987] px-4 py-2.5 font-bold text-[#2f2f2f] hover:bg-[#fde2b8] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none aria-disabled:opacity-70"
        >
          {loading ? (
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
