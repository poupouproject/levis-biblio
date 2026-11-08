// Musique du récapitulatif : jamais lancée seule (WCAG 1.4.2), seulement au geste « C'est parti »,
// et toujours coupable. Le choix de la couper est retenu dans le navigateur, et rien d'autre.

/** Clé du navigateur : présente (« non ») seulement si l'usager a coupé la musique. */
export const SOUND_KEY = 'levisbiblio:recap-musique';

export const RECAP_MUSIC = '/Pages_of_the_Year.mp3';

/** Volume normal, et plus bas sur l'écran de partage, où l'on reste plus longtemps. */
export const MUSIC_VOLUME = 0.6;
export const MUSIC_VOLUME_FINAL = 0.25;

type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'setItem' | 'removeItem'>;

/** Musique voulue, par défaut ; stockage absent ou refusé (navigation privée) : musique. */
export function readSoundPreference(storage: Reader | null): boolean {
  try {
    return storage?.getItem(SOUND_KEY) !== 'non';
  } catch {
    return true;
  }
}

export function writeSoundPreference(storage: Writer | null, on: boolean): void {
  try {
    if (on) storage?.removeItem(SOUND_KEY);
    else storage?.setItem(SOUND_KEY, 'non');
  } catch {
    // Préférence non retenue : elle vaut pour cette visite seulement
  }
}

/** Volume visé : muet sur l'écran d'ouverture (le rideau), plus bas sur l'écran de partage. */
export function musicVolume(index: number, last: number): number {
  if (index <= 0) return 0;
  return index >= last ? MUSIC_VOLUME_FINAL : MUSIC_VOLUME;
}
