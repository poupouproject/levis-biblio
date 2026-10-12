import { describe, expect, it } from 'vitest';
import {
  BRANCHES,
  branchByCode,
  branchLocation,
  directionsUrls,
  formatHour,
  formatHours,
  levisNow,
  openStatus,
  telUrl,
} from '@/lib/levis/branches';
import { branchCodeFromName } from '@/lib/levis/config';

const pgr = branchByCode('PGR');
const laCle = branchByCode('LC');
if (!pgr || !laCle) throw new Error('Succursales de test introuvables');

describe('données des succursales', () => {
  it('compte 10 succursales aux codes uniques, avec 7 jours d’horaire', () => {
    expect(BRANCHES).toHaveLength(10);
    expect(new Set(BRANCHES.map((b) => b.code)).size).toBe(10);
    for (const b of BRANCHES) {
      expect(b.hours).toHaveLength(7);
      expect(b.phone).toMatch(/^418 \d{3}-\d{4}$/);
      expect(b.latitude).toBeGreaterThan(46.5);
      expect(b.longitude).toBeLessThan(-71);
      expect(b.url).toMatch(/^https:\/\/levis\.ca\/fr\/trouver-un-lieu\//);
    }
  });

  it('garde les noms du portail : le lieu de retrait d’une réservation retrouve sa fiche', () => {
    expect(branchCodeFromName('Anne-Marie-Filteau (St-Nicolas)')).toBe('AMF');
    expect(branchCodeFromName('Saint-David - Lévis')).toBe('SD');
    expect(branchCodeFromName('Pierre-Georges-Roy (Lévis)')).toBe('PGR');
  });

  it('affiche le secteur', () => {
    expect(branchLocation(laCle)).toBe('Breakeyville, Lévis');
    expect(branchLocation(pgr)).toBe('Lévis');
  });
});

describe('heures', () => {
  it('formate les heures en français', () => {
    expect(formatHour('09:00')).toBe('9 h');
    expect(formatHour('12:30')).toBe('12 h 30');
    expect(formatHours({ open: '09:00', close: '20:00' })).toBe('9 h à 20 h');
    expect(formatHours(null)).toBe('Fermé');
  });

  it('donne l’heure de Lévis, peu importe le fuseau du serveur', () => {
    // 2026-10-13 19:00 UTC = mardi 15 h à Lévis (heure avancée de l'Est)
    expect(levisNow(new Date('2026-10-13T19:00:00Z'))).toEqual({ day: 2, minutes: 15 * 60 });
  });
});

describe('ouvert maintenant', () => {
  it('ouvert pendant les heures', () => {
    expect(openStatus(pgr, new Date('2026-10-13T19:00:00Z'))).toEqual({
      open: true,
      label: 'Ouvert · ferme à 20 h',
    });
  });

  it('fermé avant l’ouverture du jour', () => {
    // mardi 7 h
    expect(openStatus(pgr, new Date('2026-10-13T11:00:00Z')).label).toBe('Fermé · ouvre à 9 h');
  });

  it('fermé le lundi : ouvre demain', () => {
    // lundi 10 h
    expect(openStatus(pgr, new Date('2026-10-12T14:00:00Z')).label).toBe(
      'Fermé · ouvre demain à 9 h',
    );
  });

  it('saute plusieurs jours fermés', () => {
    // La Clé, mercredi 21 h : fermée jeudi et vendredi → samedi 9 h
    expect(openStatus(laCle, new Date('2026-10-15T01:00:00Z')).label).toBe(
      'Fermé · ouvre samedi à 9 h',
    );
  });
});

describe('liens', () => {
  it('construit les itinéraires Google Maps et Apple Plans', () => {
    const { google, apple } = directionsUrls(pgr);
    expect(google).toBe('https://www.google.com/maps/dir/?api=1&destination=46.81225,-71.181462');
    expect(apple).toContain('daddr=46.81225,-71.181462');
    expect(apple).toContain('q=Biblioth%C3%A8que%20Pierre-Georges-Roy');
  });

  it('construit le lien d’appel', () => {
    expect(telUrl('418 838-4122')).toBe('tel:+14188384122');
  });
});
