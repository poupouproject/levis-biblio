import { describe, it, expect } from 'vitest';
import {
  addDays,
  daysUntil,
  dueTone,
  formatDate,
  plural,
  relativeDue,
  todayIso,
} from '@/lib/account/format';
import { toPortalDate } from '@/lib/levis/account';
import { allowLoginAttempt, recordLoginSuccess } from '@/lib/account/rate-limit';

const TODAY = '2026-10-10';

describe('échéances', () => {
  it('compte les jours restants', () => {
    expect(daysUntil('2026-10-12', TODAY)).toBe(2);
    expect(daysUntil('2026-10-08', TODAY)).toBe(-2);
    expect(daysUntil('2026-11-01', TODAY)).toBe(22);
  });

  it('classe les retours (retard, bientôt, correct)', () => {
    expect(dueTone('2026-10-09', TODAY)).toBe('overdue');
    expect(dueTone('2026-10-13', TODAY)).toBe('soon');
    expect(dueTone('2026-10-14', TODAY)).toBe('ok');
    expect(dueTone(null, TODAY)).toBe('ok');
  });

  it('formule le délai en français', () => {
    expect(relativeDue('2026-10-07', TODAY)).toBe('En retard de 3 jours');
    expect(relativeDue('2026-10-09', TODAY)).toBe('En retard d’un jour');
    expect(relativeDue(TODAY, TODAY)).toBe('À rendre aujourd’hui');
    expect(relativeDue('2026-10-11', TODAY)).toBe('À rendre demain');
    expect(relativeDue('2026-10-20', TODAY)).toBe('Dans 10 jours');
  });
});

describe('dates', () => {
  it('affiche les dates en français canadien', () => {
    expect(formatDate('2026-10-25', 'long', TODAY)).toBe('25 octobre 2026');
    expect(formatDate('2026-10-25', 'short', TODAY)).not.toContain('2026');
    expect(formatDate('2025-01-21', 'short', TODAY)).toContain('2025');
    expect(formatDate(null)).toBe('');
  });

  it('additionne des jours, y compris en changeant de mois', () => {
    expect(addDays('2026-10-25', 14)).toBe('2026-11-08');
  });

  it('donne la date du jour à Lévis', () => {
    expect(todayIso(new Date('2026-10-11T02:00:00Z'))).toBe('2026-10-10');
  });

  it('convertit vers le format du portail (yyyy/m/d)', () => {
    expect(toPortalDate('2026-03-07')).toBe('2026/3/7');
  });

  it('accorde le pluriel', () => {
    expect(plural(1, 'document')).toBe('1 document');
    expect(plural(3, 'document')).toBe('3 documents');
  });
});

describe('limite des tentatives de connexion', () => {
  it('bloque après 5 essais pour une même carte, puis se réinitialise', () => {
    const now = 1_000_000;
    const card = '12345678901234';
    for (let i = 0; i < 5; i++) expect(allowLoginAttempt(`ip-${String(i)}`, card, now)).toBe(true);
    expect(allowLoginAttempt('ip-autre', card, now)).toBe(false);
    expect(allowLoginAttempt('ip-autre', card, now + 16 * 60 * 1000)).toBe(true);
    recordLoginSuccess('ip-autre', card);
  });

  it('bloque une même adresse IP après 10 essais', () => {
    const now = 5_000_000;
    for (let i = 0; i < 10; i++)
      expect(allowLoginAttempt('10.0.0.1', `carte-${String(i)}`, now)).toBe(true);
    expect(allowLoginAttempt('10.0.0.1', 'carte-x', now)).toBe(false);
  });

  it('ne compte pas les connexions réussies contre l’adresse IP', () => {
    const now = 9_000_000;
    for (let i = 0; i < 15; i++) {
      expect(allowLoginAttempt('10.0.0.2', `carte-${String(i)}`, now)).toBe(true);
      recordLoginSuccess('10.0.0.2', `carte-${String(i)}`);
    }
  });

  it('partage le compteur d’une carte quelle que soit la casse', () => {
    const now = 13_000_000;
    const ids = ['jdoe1', 'JDOE1', 'Jdoe1', 'jDoe1', 'jdOe1'];
    for (const [i, id] of ids.entries())
      expect(allowLoginAttempt(`ip-casse-${String(i)}`, id, now)).toBe(true);
    expect(allowLoginAttempt('ip-casse-x', 'JdOe1', now)).toBe(false);
  });
});
