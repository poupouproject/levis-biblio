/**
 * Normalisation des ISBN, pour rapprocher nos notices d'autres sources (Open Library, BnF…).
 * La clé commune est l'ISBN-13 sans tirets : un ISBN-10 valide est converti.
 */

/** Chiffres (et « X » final d'un ISBN-10) d'une chaîne, sans tirets, espaces ni préfixe « ISBN ». */
function cleanDigits(raw: string): string {
  return raw
    .replace(/^isbn[\s:-]*/i, '')
    .replace(/[\s-]/g, '')
    .toUpperCase();
}

export function isValidIsbn10(digits: string): boolean {
  if (!/^\d{9}[\dX]$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = digits.charAt(i);
    sum += (char === 'X' ? 10 : Number(char)) * (10 - i);
  }
  return sum % 11 === 0;
}

function isbn13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12.charAt(i)) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export function isValidIsbn13(digits: string): boolean {
  return /^97[89]\d{10}$/.test(digits) && isbn13CheckDigit(digits) === Number(digits.charAt(12));
}

/** ISBN-13 canonique (sans tirets) d'un ISBN-10 ou ISBN-13 valide ; `null` sinon. */
export function canonicalIsbn13(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = cleanDigits(raw);
  if (isValidIsbn13(digits)) return digits;
  if (!isValidIsbn10(digits)) return null;
  const first12 = `978${digits.slice(0, 9)}`;
  return `${first12}${String(isbn13CheckDigit(first12))}`;
}
