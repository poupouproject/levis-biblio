import type { Branch, OpeningHours } from '@/types';

/**
 * Succursales des Bibliothèques de Lévis.
 *
 * Source : fiches « Trouver un lieu » du site de la Ville (levis.ca, données de la carte
 * interactive), relevé le 2026-10-12. La Ville ne publie pas ces lieux en données ouvertes.
 * Horaire régulier seulement : jours fériés et fermetures temporaires sur la fiche officielle.
 * Les noms (`name`) doivent rester identiques à ceux du portail SirsiDynix (liste `pickupLibrary`).
 */
export const BRANCHES: readonly Branch[] = [
  {
    code: 'AMF',
    name: 'Anne-Marie-Filteau (St-Nicolas)',
    title: 'Bibliothèque Anne-Marie-Filteau',
    sector: 'Saint-Nicolas',
    address: '601, route des Rivières',
    latitude: 46.73589,
    longitude: -71.294008,
    phone: '418 835-8588',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-anne-marie-filteau',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
    ],
  },
  {
    code: 'AR',
    name: 'Albert-Rousseau (St-Étienne de Lauzon)',
    title: 'Bibliothèque Albert-Rousseau',
    sector: 'Saint-Étienne-de-Lauzon',
    address: '711, avenue Albert-Rousseau',
    latitude: 46.654593,
    longitude: -71.312893,
    phone: '418 831-6492',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-albert-rousseau',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
      { open: '13:00', close: '17:00' },
    ],
  },
  {
    code: 'CV',
    name: 'Croque-Volumes (St-Rédempteur)',
    title: 'Bibliothèque Croque-Volumes',
    sector: 'Saint-Rédempteur',
    address: '1325, rue Saint-Denis',
    latitude: 46.688103,
    longitude: -71.291304,
    phone: '418 831-4811',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-croque-volumes',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
      { open: '12:00', close: '20:00' },
      null,
      { open: '13:00', close: '17:00' },
    ],
  },
  {
    code: 'FM',
    name: 'Francine-McKenzie (St-Jean-Chrysostome)',
    title: 'Bibliothèque Francine-McKenzie',
    sector: 'Saint-Jean-Chrysostome',
    address: '100, rue Arlette-Fortin',
    latitude: 46.725676,
    longitude: -71.214851,
    phone: '418 839-0012',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-francine-mckenzie',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
    ],
  },
  {
    code: 'JG',
    name: 'Jean-Gosselin (Charny)',
    title: 'Bibliothèque Jean-Gosselin',
    sector: 'Charny',
    address: '3315, avenue des Églises',
    latitude: 46.713149,
    longitude: -71.272132,
    phone: '418 835-8595',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-jean-gosselin',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
      { open: '13:00', close: '17:00' },
    ],
  },
  {
    code: 'LC',
    name: 'La Clé (Breakeyville)',
    title: 'Bibliothèque La Clé',
    sector: 'Breakeyville',
    address: '2485, rue Sainte-Hélène',
    latitude: 46.676164,
    longitude: -71.226041,
    phone: '418 832-7903',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-la-cle',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      null,
      null,
      { open: '09:00', close: '12:00' },
    ],
  },
  {
    code: 'LP',
    name: 'La Pintellect (Pintendre)',
    title: 'Bibliothèque La Pintellect',
    sector: 'Pintendre',
    address: '400, rue Pamphile-Le May',
    latitude: 46.766933,
    longitude: -71.128837,
    phone: '418 838-6090',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-la-pintellect',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      null,
      null,
      { open: '09:00', close: '12:00' },
    ],
  },
  {
    code: 'LV',
    name: 'Lauréat-Vallière (St-Romuald)',
    title: 'Bibliothèque Lauréat-Vallière',
    sector: 'Saint-Romuald',
    address: '2161, chemin du Fleuve',
    latitude: 46.758379,
    longitude: -71.240739,
    phone: '418 839-5242',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-laureat-valliere',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
      { open: '09:00', close: '17:00' },
    ],
  },
  {
    code: 'SD',
    name: 'Saint-David - Lévis',
    title: 'Bibliothèque Saint-David',
    sector: 'Lévis',
    address: '4, rue Raymond-Blais',
    latitude: 46.777867,
    longitude: -71.194798,
    phone: '418 838-4127',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-saint-david',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
      { open: '12:00', close: '20:00' },
      null,
      { open: '13:00', close: '17:00' },
    ],
  },
  {
    code: 'PGR',
    name: 'Pierre-Georges-Roy (Lévis)',
    title: 'Bibliothèque Pierre-Georges-Roy',
    sector: 'Lévis',
    address: '7, rue Monseigneur-Gosselin',
    latitude: 46.81225,
    longitude: -71.181462,
    phone: '418 838-4122',
    url: 'https://levis.ca/fr/trouver-un-lieu/bibliotheque-pierre-georges-roy',
    // dim., lun., mar., mer., jeu., ven., sam.
    hours: [
      { open: '13:00', close: '17:00' },
      null,
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      { open: '12:00', close: '20:00' },
      { open: '09:00', close: '17:00' },
    ],
  },
];

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function branchByCode(code: string | null | undefined): Branch | null {
  return BRANCHES.find((b) => b.code === code) ?? null;
}

/** « Saint-Nicolas, Lévis » ou « Lévis ». */
export function branchLocation(branch: Branch): string {
  return branch.sector === 'Lévis' ? 'Lévis' : `${branch.sector}, Lévis`;
}

export function dayName(index: number): string {
  return DAYS[index] ?? '';
}

/** « 09:00 » → « 9 h », « 12:30 » → « 12 h 30 » */
export function formatHour(time: string): string {
  const [h = '0', m = '00'] = time.split(':');
  return m === '00' ? `${String(Number(h))} h` : `${String(Number(h))} h ${m}`;
}

export function formatHours(hours: OpeningHours | null): string {
  return hours ? `${formatHour(hours.open)} à ${formatHour(hours.close)}` : 'Fermé';
}

const toMinutes = (time: string): number => {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
};

/** Jour (0 = dimanche) et minute courants à Lévis. */
export function levisNow(now = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export interface OpenStatus {
  open: boolean;
  label: string; // « Ouvert · ferme à 20 h », « Fermé · ouvre mardi à 9 h »
}

/** Statut selon l'horaire régulier (n'inclut pas les fermetures exceptionnelles). */
export function openStatus(branch: Branch, now = new Date()): OpenStatus {
  const { day, minutes } = levisNow(now);
  const today = branch.hours[day] ?? null;
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return { open: true, label: `Ouvert · ferme à ${formatHour(today.close)}` };
  }
  if (today && minutes < toMinutes(today.open)) {
    return { open: false, label: `Fermé · ouvre à ${formatHour(today.open)}` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const next = (day + offset) % 7;
    const hours = branch.hours[next];
    if (hours) {
      const when = offset === 1 ? 'demain' : dayName(next);
      return { open: false, label: `Fermé · ouvre ${when} à ${formatHour(hours.open)}` };
    }
  }
  return { open: false, label: 'Fermé' };
}

/** Itinéraire vers la succursale : Google Maps (toutes plateformes) et Apple Plans. */
export function directionsUrls(branch: Branch): { google: string; apple: string } {
  const destination = `${String(branch.latitude)},${String(branch.longitude)}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    apple: `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(branch.title)}`,
  };
}

export function telUrl(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '')}`;
}
