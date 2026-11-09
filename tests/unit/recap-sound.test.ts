import { describe, expect, it } from 'vitest';
import {
  MUSIC_VOLUME,
  MUSIC_VOLUME_FINAL,
  SOUND_KEY,
  musicVolume,
  readSoundPreference,
  writeSoundPreference,
} from '@/lib/account/recap-sound';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

const refused: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('récapitulatif : musique', () => {
  it('musique par défaut, coupée seulement si l’usager l’a coupée', () => {
    const storage = memoryStorage();
    expect(readSoundPreference(storage)).toBe(true);
    writeSoundPreference(storage, false);
    expect(storage.getItem(SOUND_KEY)).toBe('non');
    expect(readSoundPreference(storage)).toBe(false);
    writeSoundPreference(storage, true);
    expect(storage.getItem(SOUND_KEY)).toBeNull();
    expect(readSoundPreference(storage)).toBe(true);
  });

  it('stockage absent ou refusé : musique, sans erreur', () => {
    expect(readSoundPreference(null)).toBe(true);
    expect(readSoundPreference(refused)).toBe(true);
    expect(() => {
      writeSoundPreference(refused, false);
    }).not.toThrow();
  });

  it('muette sur l’écran d’ouverture, plus basse sur l’écran de partage', () => {
    expect(musicVolume(0, 8)).toBe(0);
    expect(musicVolume(1, 8)).toBe(MUSIC_VOLUME);
    expect(musicVolume(7, 8)).toBe(MUSIC_VOLUME);
    expect(musicVolume(8, 8)).toBe(MUSIC_VOLUME_FINAL);
  });
});
