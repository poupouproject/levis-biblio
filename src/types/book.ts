// Work = une Œuvre au sens Open Library.
// Regroupe toutes ses éditions physiques et numériques.
// Unité d'affichage dans LévisBiblio — jamais une édition seule.

export interface Work {
  readonly workId: string; // ex: "OL1234W"
  title: string;
  authors: Author[];
  primaryEdition: Edition; // Édition française la plus récente
  allEditions: Edition[];
  allIsbns: string[]; // Agrégés de toutes éditions
  metadata: WorkMetadata;
  series: SeriesInfo | null;
}

export interface WorkMetadata {
  subjects: string[];
  firstPublishYear: number | null;
  description: string | null;
}

export interface Author {
  readonly authorId: string; // ex: "OL123A"
  name: string;
  photoKey?: string;
}

export interface Edition {
  readonly editionId: string;
  isbn13: string | null;
  isbn10: string | null;
  language: 'fr' | 'en' | 'other';
  publishYear: number | null;
  publisher: string | null;
  pageCount: number | null;
  coverKey: string | null;
}

export interface SeriesInfo {
  name: string;
  position: number | null;
  siblingWorkIds: string[];
}
