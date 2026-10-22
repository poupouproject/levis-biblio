import { afterEach, describe, expect, it, vi } from 'vitest';
import { LevisClient } from '@/lib/levis/client';
import { SessionExpiredError } from '@/lib/levis/errors';

/** Le portail répond `body` (JSON) à la prochaine requête. */
function portalResponds(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        }),
      ),
    ),
  );
}

const client = (): LevisClient => new LevisClient({ cookies: { JSESSIONID: 'x' }, csrf: 'abc' });
const FORM =
  '/client/fr_CA/accueil/search/account.accountnonmobile.checkouts.checkoutslistnonmobile.form/0?';

describe('soumission de formulaire (submitZone)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepte la redirection vers « Mon dossier » qui suit un renouvellement', async () => {
    // Réponse réelle du portail après un renouvellement réussi
    portalResponds({ redirectURL: '/client/fr_CA/accueil/search/account/1/0?' });
    await expect(client().submitZone(FORM, new URLSearchParams())).resolves.toMatchObject({
      redirectURL: '/client/fr_CA/accueil/search/account/1/0?',
    });
  });

  it('signale une session expirée si le portail renvoie vers la connexion', async () => {
    portalResponds({ redirectURL: '/client/fr_CA/accueil/search/patronlogin/https:$002f$002f…' });
    await expect(client().submitZone(FORM, new URLSearchParams())).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('garde la lecture stricte : une zone vide avec redirection reste une expiration', async () => {
    portalResponds({ redirectURL: '/client/fr_CA/accueil/search/account/1/0?' });
    await expect(client().loadZone(FORM, new URLSearchParams())).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });
});
