import { describe, expect, it } from 'vitest';
import { canonicalIsbn13, isValidIsbn10, isValidIsbn13 } from '@/lib/catalog/isbn';

describe('ISBN', () => {
  it('valide la somme de contrôle d’un ISBN-10, avec ou sans X', () => {
    expect(isValidIsbn10('2070360024')).toBe(true);
    expect(isValidIsbn10('080442957X')).toBe(true);
    expect(isValidIsbn10('2070360025')).toBe(false);
    expect(isValidIsbn10('207036002')).toBe(false);
  });

  it('valide la somme de contrôle d’un ISBN-13', () => {
    expect(isValidIsbn13('9782070360024')).toBe(true);
    expect(isValidIsbn13('9782070360025')).toBe(false);
    expect(isValidIsbn13('1234567890123')).toBe(false);
  });

  it('convertit un ISBN-10 en ISBN-13', () => {
    expect(canonicalIsbn13('2070360024')).toBe('9782070360024');
    expect(canonicalIsbn13('080442957X')).toBe('9780804429573');
  });

  it('retire tirets, espaces et préfixe « ISBN »', () => {
    expect(canonicalIsbn13('978-2-07-036002-4')).toBe('9782070360024');
    expect(canonicalIsbn13('ISBN 2-07-036002-4')).toBe('9782070360024');
    expect(canonicalIsbn13('isbn: 9782070360024')).toBe('9782070360024');
  });

  it('refuse ce qui n’est pas un ISBN valide', () => {
    expect(canonicalIsbn13(null)).toBeNull();
    expect(canonicalIsbn13('')).toBeNull();
    expect(canonicalIsbn13('029156916478')).toBeNull();
    expect(canonicalIsbn13('9782070360025')).toBeNull();
    expect(canonicalIsbn13('abc')).toBeNull();
  });
});
