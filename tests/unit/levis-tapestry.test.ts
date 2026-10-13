import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import {
  addPathParams,
  encodeTapestry,
  extractCsrf,
  linkedZoneId,
  parseZoneResponse,
  snapshotForm,
  zoneScripts,
} from '@/lib/levis/tapestry';
import { ParseError } from '@/lib/levis/errors';
import { accountPageHtml, checkoutsZoneHtml } from './fixtures/portal';

describe('encodeTapestry', () => {
  it('encode comme le portail (« / » → $002f, « | » → $007c)', () => {
    expect(encodeTapestry('ent://SD_ILS/0/SD_ILS:448655|3281811')).toBe(
      'ent:$002f$002fSD_ILS$002f0$002fSD_ILS:448655$007c3281811',
    );
    expect(encodeTapestry('Prix 5$')).toBe('Prix$00205$$');
    expect(encodeTapestry('é')).toBe('$00e9');
  });

  it('traite le vide et null comme le JavaScript du portail', () => {
    expect(encodeTapestry('')).toBe('$N');
    expect(encodeTapestry(null)).toBe('null');
  });
});

describe('addPathParams', () => {
  it('insère les segments avant la chaîne de requête', () => {
    expect(addPathParams('/a/b:event?&sdcsrf=1', 'x', 'y')).toBe('/a/b:event/x/y?&sdcsrf=1');
    expect(addPathParams('https://h/a/b/', 'true')).toBe('https://h/a/b/true');
  });
});

describe('zones AJAX', () => {
  const json = JSON.stringify({
    content: '<p>contenu</p>',
    zones: { summary: '<b>2</b>', bad: 3 },
    inits: [
      { linkZone: [{ linkId: 'form_abc123', zoneId: 'myCheckouts_zone' }] },
      { evalScript: ['a();', 'b();'] },
    ],
  });

  it('lit contenu, sous-zones, scripts et zones liées', () => {
    const zone = parseZoneResponse(json);
    expect(zone.content).toBe('<p>contenu</p>');
    expect(zone.zones).toEqual({ summary: '<b>2</b>' });
    expect(zone.redirectURL).toBeNull();
    expect(zoneScripts(zone)).toBe('a();\nb();');
    expect(linkedZoneId(zone, 'form_abc123')).toBe('myCheckouts_zone');
    expect(linkedZoneId(zone, 'autre')).toBeNull();
  });

  it('lit la redirection après connexion', () => {
    expect(parseZoneResponse('{"redirectURL":"/client/x"}').redirectURL).toBe('/client/x');
  });

  it('refuse une réponse qui n’est pas du JSON', () => {
    expect(() => parseZoneResponse('<html>')).toThrow(ParseError);
  });
});

describe('formulaires', () => {
  it('extrait le jeton CSRF d’une page', () => {
    expect(extractCsrf(accountPageHtml)).toBe('11111111-2222-3333-4444-555555555555');
    expect(extractCsrf('<p>rien</p>')).toBeNull();
  });

  it('photographie un formulaire sans les cases à cocher', () => {
    const form = snapshotForm(load(checkoutsZoneHtml), '#form_abc123');
    expect(form.id).toBe('form_abc123');
    expect(form.action).toBe(
      '/client/fr_CA/accueil/search/account.accountnonmobile.checkouts.checkoutslistnonmobile.form/0?&sdcsrf=11111111-2222-3333-4444-555555555555',
    );
    expect(Object.fromEntries(form.fields)).toEqual({
      sdcsrf: '11111111-2222-3333-4444-555555555555',
      't:formdata': 'OPAQUE==',
    });
    expect(form.submit).toEqual({
      id: 'myCheckouts_checkoutslist_submit',
      name: 'myCheckouts_checkoutslist_submit',
      value: 'submit',
    });
  });

  it('reprend les options sélectionnées des listes', () => {
    const form = snapshotForm(load(accountPageHtml), '#preferencesForm');
    expect(form.fields.get('pickupLibrary')).toBe('JG');
    expect(form.fields.get('defaultTab')).toBe('CHECKOUTS');
    expect(form.submit?.value).toBe('Mise à jour');
  });

  it('lève une erreur claire si le formulaire a disparu', () => {
    expect(() => snapshotForm(load('<div></div>'), '#absent')).toThrow(ParseError);
  });
});
