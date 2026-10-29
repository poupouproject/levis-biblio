import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';
import {
  Cookie,
  HardDrive,
  Image as ImageIcon,
  Server,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/account/PageParts';
import { CARD_FLASH_COOKIE } from '@/lib/account/login';
import { SESSION_TTL_SECONDS } from '@/lib/account/session';

export const metadata: Metadata = {
  title: 'Confidentialité | LévisBiblio',
  description:
    'Ce que LévisBiblio fait (et ne fait pas) de vos renseignements : aucun suivi, aucune donnée d’usager conservée.',
};

// À changer à chaque modification du texte.
const MISE_A_JOUR = '29 octobre 2026';

const DEPOT = 'https://github.com/poupouproject/levis-biblio';

function Paragraph({ children }: { children: ReactNode }): JSX.Element {
  return <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</p>;
}

function List({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {children}
    </ul>
  );
}

function Code({ children }: { children: ReactNode }): JSX.Element {
  return (
    <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.8rem] dark:bg-zinc-800">
      {children}
    </code>
  );
}

export default function PrivacyPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-2">
      <PageHeader
        title="Confidentialité"
        subtitle={`Ce que LévisBiblio fait de vos renseignements. Mise à jour : ${MISE_A_JOUR}.`}
      />

      <Card title="En bref" icon={ShieldCheck}>
        <div className="flex flex-col gap-3">
          <Paragraph>
            LévisBiblio ne vous suit pas. Aucune mesure d’audience, aucune publicité, aucun cookie
            tiers, aucun profil. Le site ne conserve aucune donnée sur vous.
          </Paragraph>
          <Paragraph>
            LévisBiblio est un projet citoyen, indépendant de la Ville de Lévis. Il ne fait que
            transiger entre vous et les systèmes de la Ville : il transmet vos demandes au portail
            des bibliothèques et vous affiche ses réponses.
          </Paragraph>
        </div>
      </Card>

      <Card title="Qui détient vos données" icon={UserRound}>
        <div className="flex flex-col gap-3">
          <Paragraph>
            Votre dossier d’usager (emprunts, réservations, historique, amendes, coordonnées) est
            détenu par la Ville de Lévis et son fournisseur, SirsiDynix. LévisBiblio n’en garde
            aucune copie : il le lit sur le portail à chaque consultation.
          </Paragraph>
          <Paragraph>
            Aucune personne responsable de la protection des renseignements personnels n’est nommée
            pour ce site en ce moment. La protection de votre dossier relève des politiques de la
            Ville de Lévis et de SirsiDynix, qui détiennent les données. Pour consulter ou faire
            corriger les renseignements de votre dossier, adressez-vous aux bibliothèques de Lévis.
          </Paragraph>
        </div>
      </Card>

      <Card title="Mon dossier" icon={ShieldCheck}>
        <List>
          <li>
            Votre numéro de carte et votre NIP sont transmis au portail de la Ville au moment de la
            connexion. Ils ne sont jamais conservés ni journalisés.
          </li>
          <li>
            La session est gardée dans un cookie chiffré, valide {String(SESSION_TTL_SECONDS / 60)}{' '}
            minutes et effacé à la déconnexion. Il contient la session ouverte sur le portail,
            jamais votre carte ni votre NIP.
          </li>
          <li>Le site n’a aucune base de données d’usagers.</li>
          <li>
            Si un document de votre dossier manque à notre copie du catalogue (une nouveauté), sa
            notice publique y est ajoutée : titre, auteur, ISBN et couverture. Rien ne la relie à
            vous, et elle ne porte aucune date d’ajout.
          </li>
          <li>
            Tant que la Ville ne l’a pas autorisé, la version en ligne présente un dossier fictif
            (démonstration) : rien n’y est transmis au portail.
          </li>
        </List>
      </Card>

      <Card title="Cookies" icon={Cookie}>
        <div className="flex flex-col gap-3">
          <Paragraph>
            Seulement deux cookies, tous deux nécessaires au fonctionnement de « Mon dossier » et
            posés uniquement quand vous vous connectez. Aucun consentement n’est donc demandé.
          </Paragraph>
          <List>
            <li>
              <Code>lb_dossier</Code> : votre session, chiffrée, {String(SESSION_TTL_SECONDS / 60)}{' '}
              minutes.
            </li>
            <li>
              <Code>{CARD_FLASH_COOKIE}</Code> : après une connexion refusée, garde votre numéro de
              carte 2 minutes pour préremplir le formulaire.
            </li>
          </List>
        </div>
      </Card>

      <Card title="Sur votre appareil" icon={HardDrive}>
        <div className="flex flex-col gap-3">
          <Paragraph>
            Quelques préférences restent dans votre navigateur et ne sont jamais transmises :
          </Paragraph>
          <List>
            <li>le thème choisi (clair, sombre ou automatique) ;</li>
            <li>vos recherches récentes ;</li>
            <li>le fait d’avoir déjà vu l’avis de démonstration (le temps de la visite).</li>
          </List>
          <Paragraph>
            Vous pouvez les effacer en tout temps dans les réglages du navigateur.
          </Paragraph>
        </div>
      </Card>

      <Card title="Contenus externes" icon={ImageIcon}>
        <List>
          <li>
            Les couvertures sont demandées au portail de la Ville par notre hébergeur, qui les
            réduit et les garde en cache. Votre navigateur ne contacte pas le portail pour les
            afficher.
          </li>
          <li>
            Les résumés Google Livres sont demandés par notre serveur, avec le seul ISBN du livre :
            Google ne reçoit rien qui vous concerne.
          </li>
        </List>
      </Card>

      <Card title="Hébergement et code" icon={Server}>
        <div className="flex flex-col gap-3">
          <Paragraph>
            Le site est hébergé par Vercel. Comme tout hébergeur, Vercel tient des journaux
            techniques temporaires (adresse IP, page demandée) pour le fonctionnement et la sécurité
            du service. LévisBiblio ne s’en sert pas pour vous suivre.
          </Paragraph>
          <Paragraph>
            Tout le code est public : chacun peut vérifier ce qui est décrit ici. Une question ?{' '}
            <a
              href={`${DEPOT}/issues`}
              className="font-medium text-[#8a6a2c] underline underline-offset-2 hover:text-[#d4a853] dark:text-[#d4a853]"
            >
              Écrivez-nous sur GitHub
            </a>
            .
          </Paragraph>
        </div>
      </Card>
    </div>
  );
}
