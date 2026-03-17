// Réponse brute de l'API Open Library
export interface OLSearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OLDoc[];
}

export interface OLDoc {
  key: string; // "/works/OL1234W"
  title: string;
  author_name?: string[];
  author_key?: string[];
  isbn?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  number_of_pages_median?: number;
}
