import type { JSX } from 'react';
import type { Metadata } from 'next';
import { MessageSquarePlus, Sparkles, Tag } from 'lucide-react';
import { Card, PageHeader } from '@/components/account/PageParts';
import { formatReleaseDate, readChangelog } from '@/lib/changelog';
import { REPO_URL } from '@/lib/site';
import { APP_VERSION } from '@/lib/version';

export const metadata: Metadata = {
  title: 'Nouveautés | LévisBiblio',
  description: 'Les dernières nouveautés de LévisBiblio, version par version.',
};

const LIEN =
  'font-medium text-[#8a6a2c] underline underline-offset-2 hover:text-[#d4a853] dark:text-[#d4a853]';

export default function NouveautesPage(): JSX.Element {
  const releases = readChangelog();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-2">
      <PageHeader
        title="Nouveautés"
        subtitle={`Ce qui a changé dans LévisBiblio. Vous utilisez la version ${APP_VERSION}.`}
      />

      <Card title="Une idée, un problème ?" icon={MessageSquarePlus}>
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            LévisBiblio est un projet citoyen open source : son code et sa{' '}
            <a href={REPO_URL} className={LIEN}>
              feuille de route sont publics sur GitHub
            </a>
            .
          </p>
          <p>
            Pour l’instant, il n’y a pas de formulaire dans l’application. Pour signaler un bogue ou
            suggérer une amélioration, ou poser une question, ouvrez une discussion vous-même :
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <a href={`${REPO_URL}/discussions/new?category=general`} className={LIEN}>
                Ouvrez une nouvelle discussion
              </a>{' '}
              sur GitHub. Un compte GitHub gratuit est nécessaire.
            </li>
            <li>
              Donnez un titre court, puis décrivez ce que vous avez fait, ce que vous attendiez et
              ce qui s’est passé. Indiquez la version : {APP_VERSION}.
            </li>
            <li>
              N’y écrivez <strong>jamais</strong> votre numéro de carte, votre NIP ni des
              renseignements personnels : la discussion est publique.
            </li>
          </ol>
          <p>
            <a href={`${REPO_URL}/discussions`} className={LIEN}>
              Voir les discussions déjà ouvertes
            </a>{' '}
            avant d’en créer une : la vôtre s’y trouve peut-être déjà.
          </p>
        </div>
      </Card>

      {releases.map((release) => (
        <Card
          key={release.version}
          title={`Version ${release.version}`}
          icon={release.version === APP_VERSION ? Sparkles : Tag}
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {release.date
                ? `Mise en production le ${formatReleaseDate(release.date)}`
                : 'Date de mise en production à venir'}
              {release.version === APP_VERSION && ' · version actuelle'}
            </p>
            {release.sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-1.5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {section.title}
                </h3>
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
