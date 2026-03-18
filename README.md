# 📚 LévisBiblio

**Catalogue unifié et mobile-first pour les bibliothèques de la Ville de Lévis.**

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-green?style=flat-square)](LICENSE)
[![Projet Citoyen](https://img.shields.io/badge/Projet-Citoyen-orange?style=flat-square)](#)
[![wakatime](https://wakatime.com/badge/user/ff5b588b-03b4-48fc-be65-6f19cfbace08/project/a048fb6b-08fe-4c37-a34b-8bfecfaffaba.svg)](https://wakatime.com/badge/user/ff5b588b-03b4-48fc-be65-6f19cfbace08/project/a048fb6b-08fe-4c37-a34b-8bfecfaffaba)

> **Projet citoyen open source · Sans but lucratif · Zéro BD · Zéro données personnelles**

LévisBiblio est une application web moderne conçue pour offrir aux citoyens de Lévis une expérience de consultation du catalogue de bibliothèques simplifiée et centrée sur le mobile. Ce projet agit comme une surcouche d'accélération par-dessus l'infrastructure SirsiDynix existante de la Ville, sans en modifier le fonctionnement.

> ⚠️ **Ce projet est en développement actif.** L'interface UI et le système de types sont en place; la couche de données (API, scraping, recherche) est en cours de construction. Les pages affichent actuellement des données de démonstration.

## ✨ Vision du Projet

L'objectif est de créer une interface unifiée qui :

* **Vision Unifiée :** Fusionne les inventaires physiques (SirsiDynix) et numériques (Cantook Station / PrêtNumérique) dans une seule interface.
* **Déduplication :** Regroupe toutes les éditions d'une œuvre sous une seule fiche d'affichage.
* **Vue par Série :** Affiche les tomes d'une série avec la disponibilité individuelle (physique et numérique) en un coup d'œil.
* **Zéro Base de Données :** Application 100% *stateless* — aucune donnée personnelle stockée sur le serveur.
* **Chargement Progressif :** Métadonnées affichées instantanément, suivies des disponibilités physiques et numériques en asynchrone.

## 🎯 État Actuel

| Composant | Statut |
|---|---|
| Système de types (domaine, Open Library, Cantook) | ✅ Complet |
| Composants UI (BookCard, Badge, SearchBar) | ✅ Complet |
| Layout responsive, dark mode, design mobile-first | ✅ Complet |
| Configuration Next.js (images, proxy SirsiDynix) | ✅ Complet |
| ESLint strict + Prettier + Vitest | ✅ Configuré |
| Tests unitaires sur les types | ✅ En place |
| Clients API (Open Library, Cantook, SirsiDynix) | 🚧 À implémenter |
| Server Actions (recherche, disponibilité) | 🚧 À implémenter |
| Parser HTML SirsiDynix (Cheerio) | 🚧 À implémenter |
| Recherche fonctionnelle | 🚧 À implémenter |
| Routage dynamique (page livre) | 🚧 À implémenter |
| CI/CD (GitHub Actions) | 🚧 À implémenter |
| PWA (manifest, service worker) | 🚧 À implémenter |
| Tests E2E (Playwright) | 🚧 À implémenter |

## 🏗️ Architecture Prévue

LévisBiblio agrégera en temps réel trois sources de données distinctes :

1. **Open Library (API REST) :** Métadonnées, couvertures, résumés, genres, séries et agrégation des ISBNs.
2. **Cantook Station (API REST) :** Catalogue numérique de la Ville (De Marque) — matching par titre et auteur.
3. **SirsiDynix WebPAC (Scraping HTML) :** Requêtes multi-ISBNs proxifiées et parsées côté serveur pour la disponibilité en rayon par succursale.

## 🛠️ Stack Technique

* **Framework :** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Langage :** [TypeScript](https://www.typescriptlang.org/) — mode ultra-strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
* **UI :** [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
* **Tests :** [Vitest](https://vitest.dev/) + Testing Library, couverture via v8
* **Qualité :** ESLint (strict + stylistic type-checked), Prettier

## 🚀 Installation

Prérequis : **Node.js v22+**

```bash
# Cloner le dépôt
git clone https://github.com/poupouproject/levis-biblio.git
cd levis-biblio

# Installer les dépendances
npm ci

# Démarrer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

### Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` | Build de production |
| `npm run lint` | Linting ESLint (zero warnings) |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm run test:unit` | Tests unitaires Vitest |
| `npm run test:unit:watch` | Tests en mode watch |
| `npm run test:coverage` | Couverture de code |
| `npm run format` | Formatage Prettier |

## 📁 Structure du Projet

```text
levis-biblio/
├── src/
│   ├── app/               # Routes Next.js (App Router)
│   │   ├── page.tsx       # Page d'accueil (recherche)
│   │   ├── book/[workId]/ # Fiche détaillée d'un livre
│   │   └── demo/          # Laboratoire de design UI
│   ├── components/        # Composants React
│   │   ├── book/          # BookCard
│   │   ├── search/        # SearchBar
│   │   └── ui/            # Badge, éléments réutilisables
│   ├── hooks/             # Hooks React (à venir)
│   ├── lib/               # Logique métier (à venir)
│   │   ├── actions/       # Server Actions
│   │   ├── api/           # Clients API
│   │   └── parsers/       # Parsers HTML
│   └── types/             # Types TypeScript centralisés
│       ├── book.ts        # Work, Edition, SeriesInfo
│       ├── availability.ts # Disponibilité physique/numérique
│       ├── open-library.ts # Types API Open Library
│       └── cantook.ts     # Types API Cantook Station
└── tests/
    ├── unit/              # Tests unitaires (Vitest)
    └── e2e/               # Tests E2E (à venir)
```

## 🤝 Contribuer

Ce projet est un effort citoyen ouvert à tous. Toute contribution est la bienvenue — que ce soit pour l'UI, le scraping, les tests ou une simple coquille.

1. *Fork* le projet
2. Crée ta branche (`git checkout -b feature/ma-contribution`)
3. Assure-toi que les types et le linter passent :
   ```bash
   npm run typecheck && npm run lint
   ```
4. *Commit* tes changements
5. *Push* et ouvre une Pull Request

## ☕ Soutenir le Projet

Si tu trouves ce projet utile, tu peux me soutenir :

<a href="https://www.buymeacoffee.com/yellowwait" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50"></a>

## 📝 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.