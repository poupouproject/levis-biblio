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
  author_name?: string[] | undefined;
  author_key?: string[] | undefined;
  isbn?: string[] | undefined;
  cover_i?: number | undefined;
  first_publish_year?: number | undefined;
  subject?: string[] | undefined;
  number_of_pages_median?: number | undefined;
}
