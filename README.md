# 📚 LévisBiblio

**Les bibliothèques de Lévis, simples et rapides sur téléphone.**

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-green?style=flat-square)](LICENSE)
[![Projet Citoyen](https://img.shields.io/badge/Projet-Citoyen-orange?style=flat-square)](#)
[![wakatime](https://wakatime.com/badge/user/ff5b588b-03b4-48fc-be65-6f19cfbace08/project/a048fb6b-08fe-4c37-a34b-8bfecfaffaba.svg)](https://wakatime.com/badge/user/ff5b588b-03b4-48fc-be65-6f19cfbace08/project/a048fb6b-08fe-4c37-a34b-8bfecfaffaba)

> **Projet citoyen open source · Sans but lucratif · Zéro BD · Aucune donnée personnelle stockée**

LévisBiblio est une application web pensée d'abord pour le téléphone. Elle permet aux citoyens de Lévis de gérer leur dossier de bibliothèque (emprunts, réservations, renouvellements) et de trouver leurs succursales, en quelques touchers. Elle s'appuie sur les outils existants de la Ville (portail SirsiDynix) sans les remplacer ni en modifier le fonctionnement.

> ℹ️ **Phase 1 en cours.** « Mon dossier » et les succursales fonctionnent. Une mise en ligne publique attend une entente avec la Ville de Lévis : son portail est protégé contre les requêtes automatisées, et LévisBiblio respecte cette protection. Voir la [documentation fonctionnelle](levis-biblio-fonctionnel-v4.docx).

## ✨ Fonctionnalités

| Fonctionnalité | État |
|---|---|
| **Mon dossier** : sommaire, alertes (retards, réservations prêtes) | ✅ |
| **Emprunts** : échéances en clair, renouvellement d'un ou plusieurs documents, couvertures, ISBN | ✅ |
| **Réservations** : rang dans la file, annuler, suspendre, réactiver, changer de succursale | ✅ |
| **Historique, amendes, profil et préférences** | ✅ |
| **Succursales** : adresses, heures, « ouvert maintenant », itinéraire, appel ([/bibliotheques](src/app/bibliotheques/page.tsx)) | ✅ |
| **Apparence** Auto / Clair / Sombre, squelettes de chargement, accessibilité | ✅ |
| **Recherche dans le catalogue** | 🟡 Prévue, sous réserve d'accord |
| **Disponibilité par succursale, réserver depuis le catalogue** | ⏳ Accès officiel requis |

Détails techniques de « Mon dossier » : [docs/mon-compte.md](docs/mon-compte.md).

## 🔭 Vision

À court terme : simplifier la vie des usagers, avec des pages rapides, une charge minimale sur les serveurs de la Ville et une sécurité soignée. À plus long terme :

* **Un seul catalogue** réunissant les livres imprimés et numériques (PrêtNumérique).
* **Une œuvre, une fiche** : les éditions multiples d'un même livre regroupées.
* **Vue par série** : tous les tomes et leur disponibilité d'un coup d'œil.
* **Plus tard** : films, musique et jeux ; avis de disponibilité ; utilisation hors ligne.

## 🤝 Principes

* **Respect des systèmes de la Ville** : aucune tentative de contourner leurs protections ; on respecte leurs règles d'accès aux robots (`robots.txt`) ; appels ciblés, uniquement quand un usager consulte une page ; requêtes identifiées (`LevisBiblio/1.0`). L'objectif est un accès officiel.
* **Zéro base de données** : aucune donnée d'usager conservée côté serveur.
* **Sécurité** : numéro de carte et NIP jamais conservés ni journalisés ; session chiffrée (`httpOnly`, `SameSite=Strict`, 30 min) ; tentatives de connexion limitées ; contrôle de l'origine des formulaires.

## 🏗️ Architecture

* **Next.js 16 (App Router), React 19.** Server Components pour les lectures, routes et Server Actions pour les actions.
* **Chargement partiel** : chaque page affiche tout de suite son en-tête et des squelettes (`<SkeletonScope>`), puis les données en streaming (`Suspense`). Les couvertures, plus lentes, arrivent en dernier.
* **Cache** : couvertures et ISBN gardés en mémoire dans l'onglet ; préchargement des pages sans appel au portail ; données publiques servies en statique.
* **Accès au portail** (`src/lib/levis`) : client HTTP, utilitaires Tapestry, parseurs testés, sur l'**espace usager** du portail seulement.

| Source | Usage | Statut |
|---|---|---|
| Portail SirsiDynix, espace usager | Mon dossier | Utilisé (usage personnel) |
| levis.ca (fiches des lieux) | Adresses et heures des succursales, relevées à la main | Utilisé |
| API officielle de la Ville | Recherche, disponibilité, réservation | Demandée |
| BAnQ, « Documents publiés au Québec » (données ouvertes) | Enrichir les notices (ISBN, auteurs) | Envisagé |
| PrêtNumérique (Cantook) | Catalogue numérique | Sous réserve d'accord |

## 🛠️ Pile technique

* **Framework :** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Langage :** [TypeScript](https://www.typescriptlang.org/) en mode ultra-strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
* **UI :** [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide](https://lucide.dev/)
* **Serveur :** [cheerio](https://cheerio.js.org/) (lecture du HTML), [iron-session](https://github.com/vvo/iron-session) (cookie chiffré)
* **Tests :** [Vitest](https://vitest.dev/) + Testing Library ; fixtures synthétiques, aucune donnée personnelle
* **Qualité :** ESLint (strict + stylistic type-checked, zéro avertissement), Prettier

## 🚀 Installation

Prérequis : **Node.js 24**

```bash
git clone https://github.com/poupouproject/levis-biblio.git
cd levis-biblio
npm ci

# Configurer l'environnement (LEVIS_SESSION_SECRET est obligatoire)
cp .env.example .env.local

npm run dev
```

L'application est accessible sur `http://localhost:3000`.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `LEVIS_SESSION_SECRET` | **Obligatoire.** Clé de chiffrement du cookie de session (32 caractères minimum). |
| `LEVIS_USER_AGENT` | Optionnel. Remplace le User-Agent envoyé au portail. |
| `MON_COMPTE_LEVIS`, `MON_COMPTE_LEVIS_PASS` | Développement seulement : compte pour `npm run test:live`. |

### Tester sur un téléphone

En mode dev, le téléphone peut ouvrir `http://<adresse-du-PC>:3000` sur le même réseau Wi-Fi (les adresses locales du poste sont autorisées automatiquement). **Attention :** en HTTP, le numéro de carte et le NIP circulent en clair sur le réseau. Pour un usage régulier, passer par HTTPS (par exemple Tailscale Serve).

### Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` | Build de production |
| `npm run lint` | ESLint (zéro avertissement) |
| `npm run typecheck` | Vérification des types |
| `npm run test:unit` | Tests unitaires |
| `npm run test:unit:watch` | Tests en continu |
| `npm run test:coverage` | Couverture de code |
| `npm run test:live` | Vérifie le portail avec un vrai compte (lecture seule, en local seulement) |
| `npm run format` | Formatage Prettier |

## 📁 Structure

```text
levis-biblio/
├── docs/mon-compte.md            # Protocole du portail et choix techniques de « Mon dossier »
├── levis-biblio-fonctionnel-v4.docx
├── src/
│   ├── app/
│   │   ├── compte/               # Mon dossier : connexion, pages, routes, Server Actions
│   │   ├── bibliotheques/        # Succursales (page publique)
│   │   ├── page.tsx, book/, demo/  # Maquettes de la future recherche (données fictives)
│   │   └── layout.tsx            # En-tête, menu de compte, thème
│   ├── components/
│   │   ├── account/              # Cartes, listes, menu, dialogues du dossier
│   │   ├── branches/             # Fiche de succursale
│   │   ├── ui/                   # Skeleton, ThemeSelector, Badge
│   │   └── book/, search/        # Composants des maquettes
│   ├── hooks/                    # useAccountAction, useMinute
│   ├── lib/
│   │   ├── levis/                # Accès au portail : client, auth, parseurs, succursales
│   │   ├── account/              # Session, connexion, sécurité, formatage
│   │   └── theme.ts
│   └── types/
└── tests/
    ├── unit/                     # Tests unitaires (fixtures synthétiques)
    └── live/                     # Vérification du portail avec un vrai compte (local)
```

## 🤝 Contribuer

Ce projet citoyen est ouvert à tous : UI, accessibilité, tests ou simple coquille.

1. *Fork* le projet
2. Crée ta branche (`git checkout -b feature/ma-contribution`)
3. Vérifie que tout passe :
   ```bash
   npm run typecheck && npm run lint && npm run test:unit
   ```
4. *Commit* tes changements, puis ouvre une Pull Request

Merci de ne jamais committer de données personnelles (numéro de carte, NIP, captures du portail) : les tests utilisent des données fictives.

## ☕ Soutenir le projet

Si tu trouves ce projet utile, tu peux me soutenir :

<a href="https://www.buymeacoffee.com/yellowwait" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50"></a>

## 📝 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.
