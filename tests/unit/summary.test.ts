import { describe, expect, it } from 'vitest';
import { PICKUP, RESERVATION, describe as describeResult, summarize } from '@/lib/account/summary';
import { renewalRefusedMessage } from '@/lib/account/format';
import { demoRenew, newDemoState } from '@/lib/account/demo';
import type { ActionItemResult } from '@/types';

const item = (id: string, ok: boolean): ActionItemResult => ({
  id,
  title: `Titre ${id}`,
  ok,
  message: ok ? 'OK.' : 'Refusé.',
});

describe('résumé d’une action', () => {
  it('accorde en genre et en nombre', () => {
    expect(summarize([item('1', true)], 'renouvelé')).toBe('Document renouvelé.');
    expect(summarize([item('1', true), item('2', true)], 'renouvelé')).toBe(
      '2 documents renouvelés.',
    );
    expect(summarize([item('1', true)], 'annulé', RESERVATION)).toBe('Réservation annulée.');
    expect(summarize([item('1', true), item('2', true)], 'suspendu', RESERVATION)).toBe(
      '2 réservations suspendues.',
    );
    expect(summarize([item('1', true), item('2', true)], 'modifié', PICKUP)).toBe(
      '2 lieux de retrait modifiés.',
    );
  });

  it('résume un résultat mixte et un refus complet', () => {
    expect(summarize([item('1', true), item('2', false)], 'renouvelé')).toBe(
      '1 document sur 2 renouvelé, 1 refusé.',
    );
    expect(summarize([item('1', false), item('2', false)], 'annulé', RESERVATION)).toBe(
      'Aucune réservation n’a pu être traitée.',
    );
    expect(summarize([item('1', false)], 'renouvelé')).toBe('Refusé.');
  });

  it('donne un titre par notification : succès et refus séparés', () => {
    expect(
      describeResult([item('1', true), item('2', true), item('3', false)], 'renouvelé').parts,
    ).toEqual({
      ok: '2 documents renouvelés',
      refused: 'Document non renouvelé',
    });
    expect(describeResult([item('1', true)], 'annulé', RESERVATION).parts).toEqual({
      ok: 'Réservation annulée',
      refused: null,
    });
  });
});

describe('refus de renouvellement', () => {
  it('donne le motif probable et la date de retour', () => {
    expect(renewalRefusedMessage('2026-10-31')).toMatch(/réservé.*À rapporter d’ici le 31 octobre 2026\.$/);
    expect(renewalRefusedMessage(null)).not.toMatch(/rapporter/);
  });

  it('refuse, en démo, le livre réservé par un autre usager et renouvelle les autres', () => {
    const state = newDemoState();
    const results = demoRenew(state, ['990000000101', '990000000103']);
    expect(results.find((r) => r.id === '990000000101')?.ok).toBe(true);
    expect(results.find((r) => r.id === '990000000103')).toMatchObject({
      ok: false,
      message: expect.stringContaining('un autre usager l’a réservé') as unknown,
    });
  });
});
