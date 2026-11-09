import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Une entrée du journal : un ou plusieurs paragraphes, et une éventuelle sous-liste. */
export interface ReleaseItem {
  paragraphs: string[];
  subitems: string[];
}

/** Une rubrique d’une version : « Nouveautés », « Correctifs »… */
export interface ReleaseSection {
  title: string;
  items: ReleaseItem[];
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
 * de la plus récente à la plus ancienne.
 *
 * Une entrée commence par « - ». Ses lignes indentées sont soit une sous-liste (« - »), soit
 * la suite du texte : une ligne revenue à la ligne prolonge le paragraphe, une ligne précédée
 * d’une ligne vide en ouvre un nouveau. Un texte non indenté et sans « - » devient une entrée,
 * plutôt que d’être perdu.
 */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  let section: ReleaseSection | undefined;
  let item: ReleaseItem | undefined;
  let afterBlank = false;

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const version = /^## (\d+\.\d+\.\d+\S*)$/.exec(line)?.[1];
    if (version !== undefined) {
      release = { version, date: null, sections: [] };
      releases.push(release);
      section = undefined;
      item = undefined;
      continue;
    }
    if (!release) continue;

    const title = /^### (.+)$/.exec(line)?.[1];
    if (title !== undefined) {
      section = { title, items: [] };
      release.sections.push(section);
      item = undefined;
      continue;
    }

    const date = DATE_LINE.exec(line)?.[1];
    if (date !== undefined && !section) {
      release.date = date;
      continue;
    }

    if (!section) continue;
    if (line === '') {
      afterBlank = true;
      continue;
    }

    const indented = /^\s/.test(line);
    const text = line.trim();
    if (!indented || !item) {
      const first = line.startsWith('- ') ? line.slice(2) : text;
      item = { paragraphs: [first], subitems: [] };
      section.items.push(item);
    } else if (text.startsWith('- ')) {
      item.subitems.push(text.slice(2));
    } else if (afterBlank) {
      item.paragraphs.push(text);
    } else if (item.subitems.length > 0) {
      const last = item.subitems.length - 1;
      item.subitems[last] = `${item.subitems[last] ?? ''} ${text}`;
    } else {
      const last = item.paragraphs.length - 1;
      item.paragraphs[last] = `${item.paragraphs[last] ?? ''} ${text}`;
    }
    afterBlank = false;
  }

  return releases;
}

/** Journal du dépôt, lu sur le disque (inclus au déploiement : voir next.config.ts). */
export function readChangelog(): Release[] {
  return parseChangelog(readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8'));
}
