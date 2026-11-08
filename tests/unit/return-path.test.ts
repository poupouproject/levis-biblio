import { describe, expect, it } from 'vitest';
import { returnPath, withReturn } from '@/lib/account/return-path';

describe('retour après la connexion', () => {
  it('accepte seulement le récapitulatif de l’année', () => {
    expect(returnPath('/compte/mon-annee')).toBe('/compte/mon-annee');
    expect(returnPath('/compte/mon-annee/2025')).toBe('/compte/mon-annee/2025');
  });

  it('refuse toute autre adresse, surtout vers un autre site', () => {
    for (const value of [
      'https://exemple.com',
      '//exemple.com/compte/mon-annee',
      '/compte/mon-annee/../../connexion',
      '/compte/mon-annee/2025/autre',
      '/compte/mon-annee?x=1',
      '/compte/emprunts',
      '/compte/mon-annee\\@exemple.com',
      '',
      undefined,
      ['/compte/mon-annee'],
    ]) {
      expect(returnPath(value)).toBeNull();
    }
  });

  it('ajoute le paramètre, encodé, à une adresse avec ou sans requête', () => {
    expect(withReturn('/compte/connexion', '/compte/mon-annee')).toBe(
      '/compte/connexion?suite=%2Fcompte%2Fmon-annee',
    );
    expect(withReturn('/compte/connexion?erreur=nip', '/compte/mon-annee/2025')).toBe(
      '/compte/connexion?erreur=nip&suite=%2Fcompte%2Fmon-annee%2F2025',
    );
    expect(withReturn('/compte/connexion', null)).toBe('/compte/connexion');
  });
});
