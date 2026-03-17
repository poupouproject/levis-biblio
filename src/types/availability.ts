export interface AggregatedAvailability {
  workId: string;
  physical: PhysicalAvailability;
  digital: DigitalAvailability | null;
  badge: AvailabilityBadge;
  recommendedAction: RecommendedAction;
  fetchedAt: Date;
}

export interface PhysicalAvailability {
  status: PhysicalStatus;
  branches: BranchAvailability[];
  totalCopies: number;
  availableCopies: number;
  nextReturnDate: Date | null;
}

export interface BranchAvailability {
  branchName: string;
  available: number;
  total: number;
}

export interface DigitalAvailability {
  status: 'available' | 'unavailable' | 'waitlist';
  loansCount: number;
  holdsCount: number;
  copiesCount: number;
  cantookUrl: string | null;
}

export type PhysicalStatus =
  | 'available' // Au moins 1 copie en rayon
  | 'loaned' // Toutes prêtées, retour prévu
  | 'not_in_catalog'; // Absent du catalogue SirsiDynix

// Badge discriminant pour l'affichage UI
export type AvailabilityBadge =
  | { type: 'available'; label: 'Disponible' }
  | { type: 'loaned'; label: string }
  | { type: 'digital_available'; label: 'Numérique dispo' }
  | { type: 'waitlist'; label: string }
  | { type: 'unavailable'; label: 'Non disponible' };

// Action contextuelle recommandée
export type RecommendedAction =
  | { type: 'reserve_physical'; branchOptions: string[] }
  | { type: 'borrow_digital'; cantookUrl: string }
  | { type: 'notify_when_available' }
  | { type: 'suggest_purchase' }
  | { type: 'request_ill' }; // Prêt Entre Bibliothèques
