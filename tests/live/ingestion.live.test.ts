// Injection d'une notice dans la base locale (DATABASE_URL), dans une transaction annulée à la
// fin : rien n'est gardé. Vérifie que Postgres calcule bien le reste (œuvre, série, auteur,
// vecteur de recherche).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { injectNotice } from '@/lib/catalog/ingestion';
import type { RawEdition } from '@/lib/catalog/types';

const url = process.env.DATABASE_URL;
const local = url?.includes('127.0.0.1') ?? false;
const client = new pg.Client({ connectionString: url });

const notice = (titre: string, isbn: string, auteur: string | null): RawEdition => ({
  isbn,
  titleId: `9${isbn.slice(-8)}`,
  title: titre,
  author: auteur,
  publisher: 'Éditeur fictif',
  year: 2026,
  format: 'Livres',
  pages: 200,
  cover: null,
  summary: null,
  subjects: null,
});

describe.skipIf(!local)('injection d’une notice (base locale, annulée)', () => {
  beforeAll(async () => {
    await client.connect();
    await client.query('begin');
  });
  afterAll(async () => {
    await client.query('rollback');
    await client.end();
  });

  it('rattache un nouveau tome à sa série et à son auteur existants', async () => {
    const avant = await client.query<{ nb_tomes: number }>(
      "select nb_tomes from series where slug = 'one-piece'",
    );
    const result = await injectNotice(
      client,
      notice('One Piece. 999, Notice de test', '9789999999901', 'Oda, Eiichirô, 1975-'),
    );
    expect(result).toMatchObject({ statut: 'ajoutee', oeuvreCreee: true });

    const { rows } = await client.query<{
      serie_nom: string;
      tome: number;
      auteurs: string[];
      formats: string[];
      cherchable: boolean;
    }>(
      `select serie_nom, tome, auteurs, formats,
              document @@ to_tsquery('public.catalogue', 'one:* & piece:* & oda:*') as cherchable
         from catalogue_oeuvres where id = $1`,
      [result.statut === 'ajoutee' ? result.oeuvreId : null],
    );
    expect(rows[0]).toEqual({
      serie_nom: 'One Piece',
      tome: 999,
      auteurs: ['Eiichirô Oda'],
      formats: ['livre'],
      cherchable: true,
    });
    const apres = await client.query<{ nb_tomes: number }>(
      "select nb_tomes from series where slug = 'one-piece'",
    );
    expect(apres.rows[0]?.nb_tomes).toBe((avant.rows[0]?.nb_tomes ?? 0) + 1);
  });

  it('regroupe une deuxième édition dans la même œuvre, sans doublon', async () => {
    const result = await injectNotice(
      client,
      notice('One Piece. 999, Notice de test', '9789999999902', 'Oda, Eiichirô, 1975- auteur.'),
    );
    expect(result).toMatchObject({ statut: 'ajoutee', oeuvreCreee: false });
    const { rows } = await client.query<{ nb_editions: number; auteurs: number }>(
      `select nb_editions, (select count(*)::int from auteurs where nom_famille = 'oda'
                                                    and prenom = 'eiichiro') as auteurs
         from catalogue_oeuvres where serie_slug = 'one-piece' and tome = 999`,
    );
    expect(rows[0]).toEqual({ nb_editions: 2, auteurs: 1 });
    // La même notice une deuxième fois : laissée telle quelle
    expect(
      await injectNotice(client, notice('One Piece. 999, Notice de test', '9789999999902', null)),
    ).toEqual({ statut: 'connue' });
  });

  it('crée la série et l’auteur inconnus', async () => {
    const result = await injectNotice(
      client,
      notice('Série inventée. 1, Le commencement', '9789999999903', 'Zzyzx, Quentin, 1990-'),
    );
    expect(result).toMatchObject({ statut: 'ajoutee', oeuvreCreee: true });
    const { rows } = await client.query<{ nb_tomes: number; nb_oeuvres: number }>(
      `select s.nb_tomes, a.nb_oeuvres from series s, auteurs a
        where s.slug = 'serie-inventee' and a.nom_cle = 'quentin zzyzx'`,
    );
    expect(rows[0]).toEqual({ nb_tomes: 1, nb_oeuvres: 1 });
  });
});
