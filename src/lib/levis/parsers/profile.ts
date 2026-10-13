import { load } from 'cheerio';
import type { Profile } from '@/types';
import { cleanText, decodeCfEmail, firstNameFrom, textOrNull } from './common';

/** Profil et préférences, à partir de la page « Mon dossier ». */
export function parseProfile(html: string): Profile {
  const $ = load(html);
  const fullName = cleanText($('#preferencesAccordion > h3').first().text());

  const field = (label: RegExp): string | null => {
    let value: string | null = null;
    $('.address_row').each((_, row) => {
      if (value === null && label.test(cleanText($(row).find('.address_identifier').text()))) {
        const cell = $(row).find('.address_value');
        const cf = cell.find('[data-cfemail]').attr('data-cfemail');
        value = cf ? decodeCfEmail(cf) : textOrNull(cell.text());
      }
    });
    return value;
  };

  const form = $('#preferencesForm');
  const selected = (name: string): string | null =>
    form.find(`select[name="${name}"] option[selected]`).attr('value') ?? null;

  return {
    fullName,
    firstName: firstNameFrom(fullName),
    street: field(/^Rue/i),
    city: field(/^Ville/i),
    postalCode: field(/^Code postal/i),
    phone: field(/t[ée]l[ée]phone/i),
    email: field(/^Courri/i),
    preferences: {
      language: selected('defaultLanguage') ?? 'fr_CA',
      defaultTab: selected('defaultTab') ?? 'PERSONAL',
      pickupLibrary: selected('pickupLibrary'),
      showCheckoutHistory: form.find('input[name="showCheckoutHistory"]').is('[checked]'),
    },
  };
}
