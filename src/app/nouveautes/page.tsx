import type { JSX } from 'react';
import type { Metadata } from 'next';
import { Sparkles, Tag } from 'lucide-react';
import { Card, PageHeader } from '@/components/account/PageParts';
import { formatReleaseDate, readChangelog } from '@/lib/changelog';
import { APP_VERSION } from '@/lib/version';

export const metadata: Metadata = {
  title: 'Nouveautés | LévisBiblio',
  description: 'Les dernières nouveautés de LévisBiblio, version par version.',
};

export default function NouveautesPage(): JSX.Element {
  const releases = readChangelog();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-2">
      <PageHeader
        title="Nouveautés"
        subtitle={`Ce qui a changé dans LévisBiblio. Vous utilisez la version ${APP_VERSION}.`}
      />

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
