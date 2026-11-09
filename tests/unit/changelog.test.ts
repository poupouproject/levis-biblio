import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatReleaseDate, parseChangelog } from '@/lib/changelog';

const JOURNAL = `# levis-biblio

## 0.2.0

Mise en production : 2026-11-04

### Nouveautés

- Première nouveauté.
- Une entrée sur
  deux lignes.

### Correctifs

- Un correctif.

## 0.1.0

### Correctifs

- Ancien correctif, version pas encore datée.
`;

describe('parseChangelog', () => {
  const releases = parseChangelog(JOURNAL);

  it('liste les versions de la plus récente à la plus ancienne', () => {
    expect(releases.map((r) => r.version)).toEqual(['0.2.0', '0.1.0']);
  });

  it('lit la date de mise en production, ou null', () => {
    expect(releases[0]?.date).toBe('2026-11-04');
    expect(releases[1]?.date).toBeNull();
  });

  it('range les entrées par rubrique et rejoint les entrées sur plusieurs lignes', () => {
    expect(releases[0]?.sections).toEqual([
      { title: 'Nouveautés', items: ['Première nouveauté.', 'Une entrée sur deux lignes.'] },
      { title: 'Correctifs', items: ['Un correctif.'] },
    ]);
  });

  it('accepte les fins de ligne Windows', () => {
    expect(parseChangelog(JOURNAL.replaceAll('\n', '\r\n'))[0]?.sections[0]?.items).toHaveLength(2);
  });

  it('ignore le texte avant la première version', () => {
    expect(parseChangelog('# titre\n\n- orphelin\n')).toEqual([]);
  });
});

describe('formatReleaseDate', () => {
  it('écrit le jour civil en français, sans décalage de fuseau', () => {
    expect(formatReleaseDate('2026-11-04')).toBe('4 novembre 2026');
    expect(formatReleaseDate('2026-01-01')).toBe('1 janvier 2026');
  });
});

describe('scripts/journal-en-francais.mjs', () => {
  const script = path.resolve('scripts/journal-en-francais.mjs');

  function lancer(contenu: string, version: string, date: string): string {
    const fichier = path.join(mkdtempSync(path.join(tmpdir(), 'journal-')), 'CHANGELOG.md');
    writeFileSync(fichier, contenu);
    execFileSync('node', [script, fichier, version, date]);
    return readFileSync(fichier, 'utf8');
  }

  it('date la version et traduit les titres de Changesets', () => {
    const brut =
      '# x\n\n## 0.3.0\n\n### Minor Changes\n\n- Neuf.\n\n## 0.2.0\n\nMise en production : 2026-11-04\n';
    const sortie = lancer(brut, '0.3.0', '2026-11-08');
    expect(sortie).toContain('## 0.3.0\n\nMise en production : 2026-11-08\n\n### Nouveautés');
    expect(parseChangelog(sortie).map((r) => r.date)).toEqual(['2026-11-08', '2026-11-04']);
  });

  it('ne date pas deux fois la même version', () => {
    const datee = '## 0.3.0\n\nMise en production : 2026-11-08\n\n### Correctifs\n\n- Un.\n';
    expect(lancer(datee, '0.3.0', '2026-12-25')).toBe(datee);
  });
});
