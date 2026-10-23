// Initialisation de Sentry dans le navigateur (https://docs.sentry.io/platforms/javascript/guides/nextjs/).
import * as Sentry from '@sentry/nextjs';
import { sentryCommonOptions } from '@/lib/sentry';

Sentry.init({
  ...sentryCommonOptions,

  integrations: [
    // Texte, champs et médias masqués par défaut : on voit le parcours, pas le contenu.
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    Sentry.feedbackIntegration({
      colorScheme: 'system',
      autoInject: true,
      showName: false,
      showEmail: false,
      isNameRequired: false,
      isEmailRequired: false,
      triggerLabel: 'Donner votre avis',
      triggerAriaLabel: 'Donner votre avis',
      formTitle: 'Votre avis',
      submitButtonLabel: 'Envoyer',
      cancelButtonLabel: 'Annuler',
      confirmButtonLabel: 'Confirmer',
      addScreenshotButtonLabel: 'Joindre une capture d’écran',
      removeScreenshotButtonLabel: 'Retirer la capture d’écran',
      messageLabel: 'Message',
      messagePlaceholder: 'Un problème, une idée, un commentaire ?',
      isRequiredLabel: '(obligatoire)',
      successMessageText: 'Merci ! Votre message a bien été envoyé.',
    }),
  ],

  // Rejouer surtout les sessions où une erreur survient.
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
