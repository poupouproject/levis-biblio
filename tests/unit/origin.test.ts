import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { isSameOrigin } from '@/lib/account/origin';

const post = (headers: Record<string, string>): Request =>
  new Request('http://localhost:3000/compte/connexion/ouvrir', { method: 'POST', headers });

describe('isSameOrigin', () => {
  beforeAll(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('avec Sec-Fetch-Site (navigateurs modernes, HTTPS ou localhost)', () => {
    it('accepte un envoi du même site', () => {
      expect(isSameOrigin(post({ 'sec-fetch-site': 'same-origin', host: 'a.ca' }), 't')).toBe(true);
    });

    it('accepte Origin: null quand le navigateur certifie le même site', () => {
      expect(
        isSameOrigin(post({ 'sec-fetch-site': 'same-origin', origin: 'null', host: 'a.ca' }), 't'),
      ).toBe(true);
    });

    it('refuse un autre site, même déguisé en Origin: null (cadre sandbox)', () => {
      expect(
        isSameOrigin(post({ 'sec-fetch-site': 'cross-site', origin: 'null', host: 'a.ca' }), 't'),
      ).toBe(false);
    });

    it('refuse un sous-domaine voisin (same-site) et une navigation directe (none)', () => {
      expect(isSameOrigin(post({ 'sec-fetch-site': 'same-site', host: 'a.ca' }), 't')).toBe(false);
      expect(isSameOrigin(post({ 'sec-fetch-site': 'none', host: 'a.ca' }), 't')).toBe(false);
    });
  });

  describe('repli sur Origin (HTTP sur le réseau local, vieux navigateurs)', () => {
    it('accepte la même adresse, port compris', () => {
      expect(
        isSameOrigin(
          post({ origin: 'http://192.168.22.135:3000', host: '192.168.22.135:3000' }),
          't',
        ),
      ).toBe(true);
    });

    it('compare l’hôte public derrière un proxy', () => {
      expect(
        isSameOrigin(
          post({
            origin: 'https://levisbiblio.app',
            host: 'localhost:3000',
            'x-forwarded-host': 'levisbiblio.app',
          }),
          't',
        ),
      ).toBe(true);
    });

    it('refuse un autre site, Origin: null et une origine illisible', () => {
      expect(isSameOrigin(post({ origin: 'https://evil.example', host: 'a.ca' }), 't')).toBe(false);
      expect(isSameOrigin(post({ origin: 'null', host: 'a.ca' }), 't')).toBe(false);
      expect(isSameOrigin(post({ origin: '::pas une url', host: 'a.ca' }), 't')).toBe(false);
    });

    it('accepte l’absence d’Origin (très vieux navigateurs ; le cookie SameSite protège)', () => {
      expect(isSameOrigin(post({ host: 'a.ca' }), 't')).toBe(true);
    });
  });
});
