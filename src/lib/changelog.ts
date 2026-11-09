import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Une rubrique d’une version : « Nouveautés », « Correctifs »… */
export interface ReleaseSection {
  title: string;
  items: string[];
}

export interface Release {
  version: string;
  /** Date de mise en production (AAAA-MM-JJ), absente des versions pas encore datées. */
  date: string | null;
  sections: ReleaseSection[];
}

/** Ligne que `scripts/journal-en-francais.mjs` écrit sous le titre de chaque version. */
const DATE_LINE = /^Mise en production : (\d{4}-\d{2}-\d{2})$/;

/**
 * Découpe CHANGELOG.md (produit par Changesets puis `journal-en-francais.mjs`) en versions,
 * de la plus récente à la plus ancienne. Une entrée peut s’étendre sur plusieurs lignes
 * (les suites sont indentées).
 */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  let section: ReleaseSection | undefined;

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const version = /^## (\d+\.\d+\.\d+\S*)$/.exec(line)?.[1];
    if (version !== undefined) {
      release = { version, date: null, sections: [] };
      releases.push(release);
      section = undefined;
      continue;
    }
    if (!release) continue;

    const title = /^### (.+)$/.exec(line)?.[1];
    if (title !== undefined) {
      section = { title, items: [] };
      release.sections.push(section);
      continue;
    }

    const date = DATE_LINE.exec(line)?.[1];
    if (date !== undefined && !section) {
      release.date = date;
      continue;
    }

    if (!section) continue;
    if (line.startsWith('- ')) {
      section.items.push(line.slice(2));
    } else if (/^\s+\S/.test(line)) {
      const last = section.items.length - 1;
      const previous = section.items[last];
      if (previous !== undefined) section.items[last] = `${previous} ${line.trim()}`;
    }
  }

  return releases;
}

/** Journal du dépôt, lu sur le disque (inclus au déploiement : voir next.config.ts). */
export function readChangelog(): Release[] {
  return parseChangelog(readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8'));
}

/** « 2026-11-04 » → « 4 novembre 2026 » (la date est un jour civil, pas un instant). */
export function formatReleaseDate(isoDate: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
