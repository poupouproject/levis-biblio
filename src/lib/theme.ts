// Thème clair / sombre : préférence de l'appareil, gardée dans le localStorage.

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lb-theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Script exécuté dans <head> avant l'affichage : pose la classe `dark` selon la préférence
 * enregistrée, sinon selon le système. Évite l'éclair blanc au chargement en mode sombre.
 * Si le stockage est inaccessible (navigation privée stricte…), on suit le système.
 */
export const THEME_INIT_SCRIPT = `(function(){var p='system';try{p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system'}catch(e){}var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var h=document.documentElement;h.classList.toggle('dark',d);h.style.colorScheme=d?'dark':'light';})();`;
