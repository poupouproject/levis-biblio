# 📚 LévisBiblio

**Trouver une œuvre facilement dans les bibliothèques de Lévis : une interface moderne, une recherche simple et rapide.**

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-green?style=flat-square)](LICENSE)
[![Projet Citoyen](https://img.shields.io/badge/Projet-Citoyen-orange?style=flat-square)](#)
[![wakatime](https://wakatime.com/badge/user/ff5b588b-03b4-48fc-be65-6f19cfbace08/project/a048fb6b-08fe-4c37-a34b-8bfecfaffaba.svg)](https://wakatime.com/badge/user/ff5b588b-03b4-48fc-be65-6f19cfbace08/project/a048fb6b-08fe-4c37-a34b-8bfecfaffaba)

> **Projet citoyen open source · Sans but lucratif · Zéro BD · Aucune donnée personnelle stockée**

LévisBiblio est une interface moderne pour les bibliothèques de Lévis. Son but : **trouver une œuvre facilement**, grâce à une recherche simple et rapide, sur téléphone comme sur ordinateur. Elle s'appuie sur les outils existants de la Ville (catalogue SirsiDynix, PrêtNumérique) sans les remplacer ni en modifier le fonctionnement.

## 🎯 Pourquoi

Chercher un livre dans le catalogue actuel demande de la patience :

* **Une même œuvre apparaît plusieurs fois** : chaque édition, traduction ou format a sa propre fiche, qu'il faut vérifier une par une.
* **Les séries sont éparpillées** : impossible de voir d'un coup d'œil quels tomes sont disponibles.
* **L'imprimé et le numérique sont séparés** : les livres numériques sont sur une autre plateforme, invisibles depuis le catalogue.
* **L'interface est lente et peu pratique**, surtout sur téléphone.

## ✨ Ce que LévisBiblio veut offrir

* **Une recherche simple et rapide** : des résultats clairs dès la saisie, avec couvertures et résumés.
* **Une œuvre, une fiche** : toutes les éditions d'un livre regroupées, avec la disponibilité réunie.
* **Vue par série** : tous les tomes et leur disponibilité, imprimée comme numérique.
* **Un seul catalogue** pour l'imprimé et le numérique (PrêtNumérique).
* **Une interface moderne** : rapide (chargement partiel, cache), accessible, en mode clair ou sombre, pensée d'abord pour le téléphone.
* **Plus tard** : films, musique et jeux ; avis de disponibilité ; utilisation hors ligne.

## 🚦 Où en est le projet

La recherche fonctionne sur les notices du catalogue (titres, auteurs, ISBN, couvertures), relevées une fois puis regroupées en œuvres et en séries. Les **disponibilités en temps réel** dépendent d'un accès officiel aux données de la Ville : son catalogue est protégé contre les requêtes automatisées, et LévisBiblio respecte cette protection. Une demande d'accès est en cours (voir la [documentation fonctionnelle](levis-biblio-fonctionnel-v4.docx)). D'ici là, les disponibilités affichées sont simulées.

| Fonctionnalité | État |
|---|---|
| **Accueil** : nouveautés, séries, auteurs d'ici, parcourir par type, succursales ouvertes | ✅ Livré |
| **Recherche dans le catalogue** : suggestions dès la saisie, une fiche par œuvre, filtres (type, année, disponibilité, succursale), tri, ISBN | ✅ Livré ([détails](docs/catalogue.md)) |
| **Vue par série** : tous les tomes réunis, tome précédent et suivant | ✅ Livré (imprimé ; numérique en phase 2) |
| **Disponibilité par succursale, réservation depuis le catalogue** | 🟡 Simulée ; accès officiel requis |
| **Mon dossier** : emprunts et renouvellements, réservations (rang, suspension, succursale), historique, amendes, profil | ✅ Livré ([détails](docs/mon-compte.md)) |
| **Succursales** : adresses, heures, « ouvert maintenant », itinéraire, appel | ✅ Livré |
| **Interface** : squelettes de chargement, mode clair / sombre, accessibilité | ✅ Livré |

## 🤝 Principes

* **Respect des systèmes de la Ville** : aucune tentative de contourner leurs protections ; on respecte leurs règles d'accès aux robots (`robots.txt`) ; appels ciblés, uniquement quand un usager consulte une page ; requêtes identifiées (`LevisBiblio/1.0`). L'objectif est un accès officiel.
* **Zéro base de données en production** : aucune donnée d'usager conservée côté serveur. Le catalogue public est servi depuis un jeu de démo embarqué (en développement, depuis la base locale des notices).
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
| `DATABASE_URL` | Développement seulement : base Postgres des notices scrapées (table `editions`). Absente : jeu de démo. |
| `LEVIS_DEMO` | `1` : Mon dossier en mode démonstration (voir [docs/mon-compte.md](docs/mon-compte.md)). |

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
| `npm run catalogue:demo` | Régénère le jeu de démo du catalogue depuis la base locale |

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
4. Décris ton changement pour le journal : `npx changeset`
   (ou `npx changeset add --empty` s'il n'a aucun effet visible)
5. *Commit* tes changements, puis ouvre une Pull Request

La CI refait ces vérifications sur chaque Pull Request. Chaque fusion sur `main` est une
version : la personne qui maintient le projet pose le label `ready`, la CI calcule le numéro
de version et le `CHANGELOG.md`, puis la release GitHub est créée après la fusion
(voir [docs/publication-par-label.md](docs/publication-par-label.md)).

Merci de ne jamais committer de données personnelles (numéro de carte, NIP, captures du portail) : les tests utilisent des données fictives.

## ☕ Soutenir le projet

Si tu trouves ce projet utile, tu peux me soutenir :

<a href="https://www.buymeacoffee.com/yellowwait" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50"></a>

## 📝 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.
