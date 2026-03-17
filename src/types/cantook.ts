// Contrat API Cantook Station
export interface CantookItem {
  id: string;
  title: string;
  authors: CantookAuthor[];
  cover_url: string | null;
  formats: CantookFormat[];
  availability: CantookAvailability;
}

export interface CantookAuthor {
  name: string;
  role: string;
}

export interface CantookFormat {
  type: string;
  drm: string;
}

export interface CantookAvailability {
  status: 'available' | 'unavailable' | 'waitlist';
  loans_count: number;
  holds_count: number;
  copies_count: number;
}
