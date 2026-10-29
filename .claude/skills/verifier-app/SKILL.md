---
name: verifier-app
description: Lancer LévisBiblio et vérifier un changement dans un vrai navigateur (pages, interactions, captures d'écran, mode démonstration, simulation de la production) sur le poste Windows du propriétaire. À lire avant de démarrer `next dev`, `next build` ou Playwright dans ce dépôt.
---

# Lancer et vérifier l'application

## Ne pas déranger le serveur du propriétaire

- Le propriétaire a souvent son propre `next dev` sur le port **3000**, depuis ce dossier.
  Ne jamais l'arrêter. Le vérifier : `netstat -ano | grep ":3000 .*LISTENING"`.
- Next refuse un second `next dev` dans le même dossier (« Another next dev server is
  already running »). Pour un serveur à soi, utiliser **une copie isolée** (ci-dessous).
- Arrêter ses propres serveurs à la fin, par leur port (`taskkill //PID <pid> //T //F`).

## Copie isolée (dans le dossier scratchpad)

```bash
S=<dossier scratchpad>; rm -rf "$S/wt" && mkdir -p "$S/wt"
git ls-files -co --exclude-standard | grep -v "^\.snapshots/" | tar -cf - -T - | tar -xf - -C "$S/wt"
cp .env.local "$S/wt/"          # ou une variante : sans DATABASE_URL, avec LEVIS_DEMO=1
cd "$S/wt" && npm ci            # ~1 min
npx next dev --turbopack -p 3100   # en arrière-plan
```

- `npm ci` dans la copie : **pas de lien** vers le `node_modules` du dépôt, Turbopack refuse
  un `node_modules` en lien symbolique ou jonction.
- Après une modification dans le dépôt, recopier les fichiers touchés dans la copie.

## Variantes utiles

| But                             | Environnement                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue complet (base Docker) | `.env.local` tel quel (`DATABASE_URL`)                                                                                                                   |
| Mon dossier fictif, captures    | `LEVIS_DEMO=1`, puis « Explorer le dossier de démonstration »                                                                                            |
| Comme en production (Vercel)    | `next build` puis `next start`, **sans** `DATABASE_URL`, avec `LEVIS_DEMO=1`, `NEXT_PUBLIC_VERCEL_ENV=production` et un `LEVIS_SESSION_SECRET` aléatoire |

Les variables lues dans la coquille statique (`LEVIS_DEMO`, `LEVIS_BANNIERE_DEMO`) sont fixées
au build : les donner **au build et au démarrage**, sinon chaque page lève une erreur
d'hydratation (React #418). Ne jamais relancer `next build` pendant que son `next start` tourne
dans la même copie : arrêter le serveur d'abord.

Avec la base, le premier affichage attend le chargement du catalogue (5 à 9 s) : faire une
requête de chauffe (`/api/catalogue/suggestions?q=zz`) avant de mesurer ou de capturer.
**Ne pas** précharger le catalogue dans `instrumentation.ts` : avec Turbopack, ça fait boucler
le rechargement à chaud (la page se recharge sans fin).

## Navigateur : Playwright avec Edge

Pas de téléchargement de navigateur : `playwright-core` avec l'Edge installé.

```bash
cd "$S/shots-tool" && npm init -y && npm i playwright-core@1
```

```js
const browser = await chromium.launch({ channel: 'msedge' });
await page.goto(url, { waitUntil: 'load' }); // pas 'networkidle' : le rechargement à chaud ne s'arrête jamais
```

- Couvertures en chargement différé : faire défiler la page (`page.mouse.wheel`) avant une
  capture pleine page.
- Relever les erreurs : `page.on('pageerror')` et la console `error` (erreurs d'hydratation).
- Vérifier la largeur mobile à **390 px** : `document.documentElement.scrollWidth` doit
  égaler la largeur (pas de débordement horizontal).
- Edge sans Playwright (`msedge --headless --screenshot`) ne produit rien ici et laisse des
  processus qui rechargent la page en boucle : ne pas l'utiliser.

## Pièges de Git Bash (Windows)

- Avec `MSYS_NO_PATHCONV=1`, un chemin `/tmp/...` donné à un programme Windows (curl) ne
  désigne **pas** le même dossier que `/tmp` pour Bash : écrire et lire les fichiers dans le
  dossier scratchpad, avec son chemin complet.
- `sleep` long interdit : attendre un serveur avec une boucle `curl` courte, ou lancer en
  arrière-plan.
