// Initialisation de Sentry sur le serveur (https://docs.sentry.io/platforms/javascript/guides/nextjs/).
import * as Sentry from '@sentry/nextjs';
import { sentryCommonOptions } from './src/lib/sentry';

Sentry.init({
  ...sentryCommonOptions,
  // Sépare les erreurs de la démonstration de celles du vrai site.
  initialScope: { tags: { demo: process.env.LEVIS_DEMO === '1' } },
});
