import { describe, it, expect } from 'vitest';
import { parseCheckouts, parseCheckoutsSummary } from '@/lib/levis/parsers/checkouts';
import {
  holdStatusFrom,
  parseEditPickupUrl,
  parseHoldActionKeys,
  parseHoldItemsUrl,
  parseHolds,
  parseHoldsSummary,
} from '@/lib/levis/parsers/holds';
import { parseHistory } from '@/lib/levis/parsers/history';
import { parseFines } from '@/lib/levis/parsers/fines';
import { parseProfile } from '@/lib/levis/parsers/profile';
import {
  decodeCfEmail,
  firstNameFrom,
  isbnFromCoverUrl,
  normalizeCoverUrl,
  parseExtras,
  parseMoney,
  parsePortalDate,
  titleIdFrom,
} from '@/lib/levis/parsers/common';
import {
  accountPageHtml,
  CF_EMAIL,
  checkoutsZoneHtml,
  finesZoneHtml,
  historyZoneHtml,
  holdsScripts,
  holdsZoneHtml,
} from './fixtures/portal';

describe('utilitaires de lecture', () => {
  it('convertit les dates AA-MM-JJ du portail en ISO', () => {
    expect(parsePortalDate('26-10-25')).toBe('2026-10-25');
    expect(parsePortalDate(' 23-3-7 ')).toBe('2023-03-07');
    expect(parsePortalDate('')).toBeNull();
  });

  it('lit les montants en dollars canadiens', () => {
    expect(parseMoney('3,50 $')).toBe(3.5);
    expect(parseMoney('1 234,05 $')).toBe(1234.05);
    expect(parseMoney('0,00 $')).toBe(0);
  });

  it('extrait l’ID du titre des valeurs brutes et encodées', () => {
    expect(titleIdFrom('ent://SD_ILS/0/SD_ILS:91278|123')).toBe('91278');
    expect(titleIdFrom('detailclick/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:475765/8')).toBe(
      '475765',
    );
    expect(titleIdFrom('rien')).toBeNull();
  });

  it('décode les courriels masqués par Cloudflare', () => {
    expect(decodeCfEmail(CF_EMAIL)).toBe('test@exemple.ca');
    expect(decodeCfEmail('zz')).toBeNull();
  });

  it('normalise les URL de couverture', () => {
    expect(
      normalizeCoverUrl('https://LEVI.ent.sirsidynix.net/client/accueil/search/btlffile/978/cover'),
    ).toBe('https://levi.ent.sirsidynix.net/client/accueil/search/btlffile/978/cover');
    expect(normalizeCoverUrl('/client/images/no_image.png')).toBeNull();
  });

  it('tire le prénom de « Nom, Prénom »', () => {
    expect(firstNameFrom('Tremblay, Marie')).toBe('Marie');
    expect(firstNameFrom('Madonna')).toBe('Madonna');
  });

  it('tire l’ISBN de l’adresse d’une couverture (ISBN-13 et ISBN-10 avec X)', () => {
    expect(isbnFromCoverUrl('https://h/client/accueil/search/btlffile/9782075187794/cover')).toBe(
      '9782075187794',
    );
    expect(isbnFromCoverUrl('https://h/client/accueil/search/btlffile/272344404x/cover')).toBe(
      '272344404X',
    );
    expect(isbnFromCoverUrl('/client/images/no_image.png')).toBeNull();
    expect(isbnFromCoverUrl(null)).toBeNull();
  });

  it('lit la réponse JSON des couvertures différées', () => {
    const items = parseExtras(
      '{"array":[{"identifier":4000001,"itemID":"9902","image":"https://LEVI.ent.sirsidynix.net/client/accueil/search/btlffile/9782075187794/cover"},{"identifier":"990300000001","image":"x"}]}',
    );
    expect(items[0]).toEqual({
      identifier: '4000001',
      itemId: '9902',
      image: 'https://levi.ent.sirsidynix.net/client/accueil/search/btlffile/9782075187794/cover',
      isbn: '9782075187794',
    });
    expect(items[1]?.isbn).toBeNull();
    expect(items[1]?.image).toBeNull();
    expect(parseExtras('pas du json')).toEqual([]);
  });
});

describe('emprunts', () => {
  const checkouts = parseCheckouts(checkoutsZoneHtml);

  it('lit chaque emprunt avec code-barres, titre, auteur, cote et date', () => {
    expect(checkouts).toHaveLength(2);
    expect(checkouts[0]).toMatchObject({
      barcode: '990300000001',
      titleId: '111111',
      title: 'Le livre fictif. 2, La suite',
      author: 'Auteur, Imaginaire, 1970-',
      callNumber: 'J R123 liv v.2',
      dueDate: '2026-10-05',
      renewals: 1,
      alert: 'En retard',
      checkboxName: 'checkbox',
    });
    expect(checkouts[1]).toMatchObject({
      barcode: '990300000002',
      callNumber: null,
      alert: null,
      checkboxName: 'checkbox_0',
    });
  });

  it('lit le résumé (total, retards)', () => {
    expect(parseCheckoutsSummary(checkoutsZoneHtml, 0)).toEqual({ total: 2, overdue: 1 });
  });
});

describe('réservations', () => {
  const holds = parseHolds(holdsZoneHtml);

  it('lit statut, lieu de retrait, code de succursale et rang', () => {
    expect(holds).toHaveLength(3);
    expect(holds[0]).toMatchObject({
      key: 'ent://SD_ILS/0/SD_ILS:333333|4000001',
      holdId: '4000001',
      titleId: '333333',
      status: 'ready',
      pickupCode: 'JG',
      date: '2026-10-15',
      canChangePickup: false,
    });
    expect(holds[1]).toMatchObject({
      status: 'waiting',
      queuePosition: 3,
      pickupCode: 'AMF',
      callNumber: 'J BD X1',
      canChangePickup: true,
    });
    expect(holds[2]).toMatchObject({ status: 'suspended', pickupCode: null });
  });

  it('reconnaît les statuts usuels', () => {
    expect(holdStatusFrom('En transit', '')).toBe('in_transit');
    expect(holdStatusFrom('Inconnu', '')).toBe('other');
  });

  it('lit le résumé', () => {
    expect(parseHoldsSummary(holdsZoneHtml, holds)).toEqual({ total: 3, ready: 1 });
  });

  it('extrait les clés d’action et l’URL de changement de succursale', () => {
    expect(parseHoldActionKeys(holdsScripts)).toEqual({
      'ent://SD_ILS/0/SD_ILS:333333|4000001': '4000001|null',
      'ent://SD_ILS/0/SD_ILS:444444|4000002': '4000002|null',
    });
    expect(parseEditPickupUrl(holdsScripts)).toContain(':editpickuplibraries/');
    expect(
      parseHoldItemsUrl(
        "PlaceHoldDialog.setup('Modifier','/client/x:holditems?&sdcsrf=1','https://y',false);",
      ),
    ).toBe('/client/x:holditems?&sdcsrf=1');
  });
});

describe('historique, amendes et profil', () => {
  it('trie l’historique du plus récent au plus ancien', () => {
    const history = parseHistory(historyZoneHtml);
    expect(history.map((h) => h.title)).toEqual(['Livre récent', 'Ancien livre']);
    expect(history[1]).toEqual({
      title: 'Ancien livre',
      author: 'Vieil, Auteur',
      checkedOut: '2023-03-23',
      returned: '2023-04-13',
    });
    expect(history[0]?.author).toBeNull();
  });

  it('lit les montants et le détail des amendes', () => {
    expect(parseFines(finesZoneHtml)).toEqual({
      currentCount: 2,
      amountDue: 3.5,
      amountDueLabel: '3,50 $',
      accruedCount: 1,
      totalPaid: 12.25,
      totalPaidLabel: '12,25 $',
      headers: ['Titre', 'Raison', 'Montant'],
      lines: [{ cells: ['Le livre fictif', 'Retard', '3,50 $'] }],
    });
  });

  it('lit les coordonnées et les préférences', () => {
    expect(parseProfile(accountPageHtml)).toEqual({
      fullName: 'Tremblay, Marie',
      firstName: 'Marie',
      street: '123 rue Fictive',
      city: 'Lévis, QC',
      postalCode: 'G6V 0A0',
      phone: '418-555-0000',
      email: 'test@exemple.ca',
      preferences: {
        language: 'fr_CA',
        defaultTab: 'CHECKOUTS',
        pickupLibrary: 'JG',
        showCheckoutHistory: true,
      },
    });
  });
});
