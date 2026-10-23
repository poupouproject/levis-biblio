// Initialisation de Sentry pour l’edge (intergiciel, routes edge).
import * as Sentry from '@sentry/nextjs';
import { sentryCommonOptions } from './src/lib/sentry';

Sentry.init(sentryCommonOptions);
