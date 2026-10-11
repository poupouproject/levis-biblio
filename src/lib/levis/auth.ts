import 'server-only';
import { load } from 'cheerio';
import { LevisClient, type LevisSessionState } from './client';
import { LEVIS_ACCOUNT_PATH, LEVIS_LOGIN_PATH } from './config';
import { InvalidCredentialsError, ParseError, UpstreamError } from './errors';
import { cleanText, firstNameFrom } from './parsers/common';
import { parseZoneResponse, snapshotForm } from './tapestry';

export interface LoginResult {
  state: LevisSessionState;
  firstName: string;
}

/**
 * Ouvre une session sur le portail avec le numéro de carte et le NIP.
 * Les identifiants ne vivent que dans cette fonction : ils ne sont ni conservés ni journalisés.
 */
export async function login(card: string, pin: string): Promise<LoginResult> {
  const client = new LevisClient();
  const page = await client.get(LEVIS_LOGIN_PATH);
  const $ = load(page.text);
  const form = snapshotForm($, '#loginPageForm');
  client.csrf = form.fields.get('sdcsrf');

  form.fields.set('j_username', card);
  form.fields.set('j_password', pin);
  if (form.submit) form.fields.set('t:submit', JSON.stringify([form.submit.id, form.submit.name]));

  const res = await client.postAjax(form.action, form.fields);
  if (!res.contentType.includes('json')) throw new UpstreamError();
  const zone = parseZoneResponse(res.text);

  if (!zone.redirectURL) {
    const html = [zone.content, ...Object.values(zone.zones)].join('');
    const $err = load(html);
    const message = cleanText(
      $err('.formMessage, .errorSection, .t-error, .loginError, .alert').first().text(),
    );
    throw new InvalidCredentialsError(message || undefined);
  }

  await client.get(zone.redirectURL);
  const accountHtml = await client.loadAccountPage();
  const fullName = cleanText(load(accountHtml)('#preferencesAccordion > h3').first().text());
  if (!fullName) throw new ParseError('votre dossier');

  return { state: client.toState(), firstName: firstNameFrom(fullName) };
}

/** Ferme la session sur le portail. Ne lève jamais : la déconnexion locale doit toujours réussir. */
export async function logout(state: LevisSessionState): Promise<void> {
  try {
    const client = new LevisClient(state);
    await client.get(
      `${LEVIS_ACCOUNT_PATH}.template.header.mainmenu_0.logout?&sdcsrf=${state.csrf}`,
    );
  } catch {
    // Session déjà expirée ou portail injoignable : rien d'autre à faire.
  }
}
