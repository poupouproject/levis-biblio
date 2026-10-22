# Publier une version en posant le label `ready`

> **Pour l'agent qui l'implémente dans ce dépôt.** Ce guide décrit un flux de
> publication mis en place et éprouvé dans le dépôt
> [`poupouproject/tache-et-point-enfants`](https://github.com/poupouproject/tache-et-point-enfants)
> (add-on Home Assistant, publié en images Docker sur GHCR). Le mécanisme est
> réutilisable tel quel ; l'étape « publier » est propre à chaque projet et
> doit être adaptée (§ 6). Les fichiers de référence sont copiés dans
> [`publication-par-label/reference/`](publication-par-label/reference/), pris
> sur `main` au commit `154e118`. Ils ne s'exécutent pas d'ici : à adapter puis
> placer dans `.github/`.

## 1. Ce que veut le propriétaire du dépôt

- **Chaque pull request fusionnée sur `main` est une version.** Pas de PR
  « version » séparée à fusionner ensuite.
- **On regroupe dans une branche de fonctionnalité** : la PR reste en
  brouillon, ou ouverte sans label, et on continue d'y empiler.
- **Publier = poser le label `ready`.** La CI calcule la version dans la PR,
  reteste ce commit, puis **GitHub fusionne seul** (fusion automatique).
- **Un nouveau commit retire `ready`** : tout ce qui avait été validé ne vaut
  plus, il faut reposer le label et tout repart de zéro.
- **Les tests passent avant les builds** : un échec de tests ne doit occuper
  aucun runner de build ni retarder une autre PR.
- **Une seule PR prépare une version à la fois** (verrou), les autres attendent
  en file.
- **Release GitHub** (tag `vX.Y.Z` + notes) créée sur `main`, après la fusion.

## 2. Vue d'ensemble

Trois workflows, un label-verrou, une règle (ruleset) sur `main`.

```
 commit sur la PR ──► « Vérifier la PR »
                       changeset ─┐
                       Tests ─────┴─► Image(s) (seulement si Tests passe)
                       retire `ready` et le verrou s'ils étaient posés

 label `ready`    ──► « Prêt à publier »
                       porte (une à la fois) : vérifications vertes ?
                         └─ verrou libre ? prend `publication-en-cours`
                            sinon « En file d'attente derrière #N »
                       version : merge de main, `npm run version`, commit
                       tests → images, SUR CE COMMIT
                       feu vert : statuts exigés posés sur ce commit
                       → « Prêt à publier » vert → GitHub fusionne (auto-merge)

 push sur main    ──► « Publier »
                       lit la version écrite ; si elle n'existe pas encore :
                       artefacts publiés, tag vX.Y.Z, release GitHub
                       libère le verrou, relance la PR suivante en file
```

| Fichier de référence | Rôle |
|---|---|
| `workflows/verifier-pr.yml` | À chaque commit de PR : changeset, **Tests**, puis builds. Noms = vérifications exigées par la règle. |
| `workflows/pret-a-publier.yml` | Déclenché par le label (et par `workflow_dispatch` pour la file d'attente). Porte, version, retests, feu vert, échec. |
| `scripts/porte.sh` | Logique de la porte : événements, brouillon, vérifications vertes, verrou, file. |
| `scripts/suivante.sh` | Relance « Prêt à publier » pour la plus ancienne PR en file. |
| `workflows/publier-addon.yml` | Sur `main` : publier ce qui est écrit, release GitHub, libérer le verrou. **Partie à adapter.** |
| `actions/tests/action.yml` | Action composite : `npm ci`, typage, lint, tests, build. |
| `actions/image/action.yml` | Action composite : build Docker, test de démarrage, push GHCR. **Propre à l'add-on.** |
| `scripts/sync-addon-version.mjs` | Recopie la version de `package.json` dans `config.yaml` et nettoie le journal. **Propre à l'add-on.** |
| `scripts/changelog.mjs`, `changeset-config.json` | Générateur de journal Changesets sans hash de commit, en français. |

## 3. Les mécanismes qui font marcher le tout

### 3.1 La fusion automatique, activée par une personne

La PR a la **fusion automatique activée dès son ouverture** ; c'est la règle de
`main` qui retient la fusion tant qu'une vérification exigée n'est pas verte.
Aucun workflow ne fusionne.

L'auto-merge doit être **activé par une personne** (bouton de la PR, ou
`gh pr merge N --auto --merge` avec son compte). Activé par la CI avec
`GITHUB_TOKEN`, la fusion serait attribuée au robot et le `push` sur `main`
**ne déclencherait pas** « Publier » (GitHub ne lance aucun workflow pour un
événement produit par `GITHUB_TOKEN`, sauf `workflow_dispatch` et
`repository_dispatch`).

### 3.2 « Prêt à publier » : un statut qui retient la fusion

C'est un **statut de commit** (API `POST /repos/{o}/{r}/statuses/{sha}`, contexte
`Prêt à publier`), pas un job. La porte le pose à `pending` (« En attente du
label ready », « En file d'attente derrière #12 », etc.) ; seul le feu vert le
passe à `success`. Exigé par la règle de `main`, il bloque la fusion tant qu'il
n'est pas vert.

Sur les jobs sautés : d'expérience du propriétaire, un job sauté (`if:`) dans
un workflow bloque la fusion s'il est exigé par un ruleset. On ne s'appuie pas
dessus : le statut explicite bloque dans tous les cas, et les jobs du workflow
de préparation sont **préfixés** (`Préparation · tests`) pour ne jamais porter
le nom d'une vérification exigée (`Tests`) — sinon un job sauté ou réussi dans
le mauvais workflow pourrait satisfaire ou fausser la règle.

### 3.3 Le commit de version ne relance rien : le feu vert pose les statuts

La préparation pousse un commit (`Version … X.Y.Z`) avec `GITHUB_TOKEN`. Ce push
**ne déclenche pas** « Vérifier la PR » : ce commit n'aurait aucune des
vérifications exigées, et la fusion resterait bloquée.

Solution sans jeton personnel : la préparation **exécute elle-même** les tests
et les builds sur ce commit, puis le job « feu vert » pose sur lui des statuts
portant **exactement les noms exigés** (`Tests`, `Image amd64`, …) avec un lien
vers l'exécution. Les vérifications ont réellement tourné sur ce commit ; ce
n'est pas un contournement. Une règle de ruleset accepte indifféremment un check
run ou un statut de même nom.

Effet secondaire utile : ce commit n'émet pas d'événement `synchronize`, donc
il ne retire pas `ready` (pas de boucle).

### 3.4 Le verrou : `concurrency` + un label

- Le job « porte » est sous `concurrency: { group: publication-porte,
  cancel-in-progress: false }` : une seule évaluation à la fois, toutes PR
  confondues. La lecture du verrou et sa prise ne peuvent pas se croiser.
- Le verrou est le label **`publication-en-cours`**, visible dans la liste des
  PR. Une autre PR `ready` voit « En file d'attente derrière #N ».
- Libéré par « Publier » (après la publication sur `main`), par le job d'échec
  de la préparation, ou à la fermeture / au retrait de `ready`. Chaque
  libération appelle `suivante.sh`, qui relance « Prêt à publier »
  (`workflow_dispatch`, autorisé avec `GITHUB_TOKEN`) pour la plus ancienne PR
  en file.
- Coincé ? Retirer le label à la main.

**Rejeté :** une variable de dépôt `LOCK=true/false`. `GITHUB_TOKEN` n'a pas le
droit d'écrire les variables du dépôt (il faudrait un PAT), et « lire puis
écrire » n'est pas atomique.

### 3.5 Une branche à jour avec `main`, conflits sur les fichiers de version

La règle exige une branche à jour (`strict_required_status_checks_policy`).
Deux PR préparées à la suite ont toutes deux modifié les fichiers de version :
la préparation fait `git merge origin/main` et, en cas de conflit, **reprend
la version de `main` des seuls fichiers générés** (`package.json`,
`package-lock.json`, `CHANGELOG.md`, …) avant de recalculer. Tout autre
conflit fait échouer la préparation (règlement humain).

### 3.6 Ce qui retire `ready`

`porte.sh`, sur `pull_request` :

- `synchronize` (commit poussé par quelqu'un) → retire `ready`, libère le
  verrou, statut `pending`.
- `unlabeled ready` → libère le verrou.
- `closed` (fusionnée ou abandonnée) → retire `ready`, libère le verrou.
- Une vérification de la PR en échec → retire `ready`, statut `failure`.
- `labeled` sur un autre label (dont le verrou lui-même) → ignoré.

### 3.7 Les vérifications de la PR doivent être vertes avant le verrou

La porte lit les check runs du commit (`/commits/{sha}/check-runs`), en
prenant **la plus récente exécution** de chaque nom (`max_by(.id)` : une
relance remplace la précédente). Encore en cours → `pending` ; « Vérifier la
PR » relance la porte à la fin (job `relance`, si la PR a `ready`). Ainsi un
échec de tests ne prend jamais le verrou.

Exception : si le dernier commit est celui de la CI (préparation précédente
échouée), il n'a pas de vérifications de PR ; la porte n'en exige pas, la
préparation le reteste de toute façon.

## 4. Pièges rencontrés

1. **Pas de filtre `paths:` sur un workflow qui produit des vérifications
   exigées.** Une PR qui ne touche que la CI ou la doc ne les produirait jamais
   et resterait bloquée. Filtrer *dans* le job (ex. : changeset requis
   seulement si le code de l'app change).
2. **Le premier passage des tests en CI a échoué** alors que tout passait en
   local : les types `PageProps` / `LayoutProps` de Next vivent dans
   `.next/types`, absents d'une copie neuve. `npx next typegen` avant
   `tsc --noEmit`. Si les tests ne tournaient jusqu'ici qu'en local, prévoir
   ce genre de surprise.
3. **Lockfile et plateforme** : `npm install` sous Windows / macOS n'inscrit que
   les dépendances optionnelles natives de la plateforme courante. La
   préparation régénère le lockfile sous Linux
   (`npm install --package-lock-only --ignore-scripts`) après le changement de
   version.
4. **Git Bash sous Windows** réécrit `origin/main:chemin` en chemin Windows :
   `MSYS_NO_PATHCONV=1` pour `git show`, `docker run -v`, etc.
5. **Changeset vide** (CI, doc) : la version ne bouge pas. La préparation
   ne committe aucun changement de version, reteste et donne le feu vert ; « Publier » voit que la version
   existe déjà et ne fait rien. Pas de version superflue.
6. **Label `ready` resté sur la PR fusionnée** : sans effet (seules les PR
   ouvertes sont lues), mais à nettoyer dans « Publier » si on veut une liste
   propre.

## 5. Réglages du dépôt

Faits par API dans le dépôt de référence :

```bash
R=poupouproject/levis-biblio
gh api -X PATCH repos/$R -F allow_auto_merge=true
gh label create ready --color 0e8a16 --description "Publier cette pull request"
gh label create publication-en-cours --color fbca04 \
  --description "Verrou : cette PR est en cours de publication (géré par la CI)"
gh api -X POST repos/$R/rulesets --input ruleset.json
```

`ruleset.json` (adapter la liste des vérifications à ce projet) :

```json
{
  "name": "main : publication par label ready",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "Tests" },
          { "context": "Un changeset accompagne la branche" },
          { "context": "Prêt à publier" }
        ] } }
  ]
}
```

Les rulesets demandent un dépôt public ou GitHub Pro (ce dépôt est public).
Ce sont des réglages du dépôt : **demander l'accord du propriétaire** avant de
les appliquer.

## 6. Adapter à `levis-biblio`

Ce dépôt n'a aujourd'hui ni `.github/`, ni Changesets, ni version tenue
(`package.json` : `0.1.0`), et ses tests sont
`npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`
(Vitest ; `test:live` touche le vrai portail et **ne doit pas** tourner en CI).

**À reprendre presque tel quel :** `pret-a-publier.yml` (porte, version,
tests, feu vert, échec), `porte.sh`, `suivante.sh`, le job changeset de
`verifier-pr.yml`, la logique du verrou et de la release.

**À adapter :**

1. **Changesets** : `npm i -D @changesets/cli`, `npx changeset init`, script
   `"version": "changeset version"` dans `package.json`. Le générateur
   `changelog.mjs` est optionnel (journal sans hash de commit, en français).
   `sync-addon-version.mjs` ne sert pas ici : il recopiait la version dans le
   manifeste de l'add-on Home Assistant.
2. **`actions/tests`** : remplacer les commandes par celles de ce dépôt
   (`typecheck`, `lint`, `test:unit`, `build`). Vérifier que `next build`
   n'exige pas de secrets ; sinon fournir des valeurs factices en CI.
3. **Builds d'images** : il n'y en a pas ici. Supprimer le job `image` de
   `verifier-pr.yml` et de la préparation, retirer `Image amd64/aarch64` de
   `CHECKS` (variable d'env. de `pret-a-publier.yml`) et du ruleset.
4. **Fichiers générés** (§ 3.5) : la liste `generated=` de la préparation
   devient `package.json package-lock.json CHANGELOG.md` à la racine. Le
   dossier de travail n'est plus `taches-et-points/` mais la racine du dépôt :
   retirer les `working-directory` et préfixes de chemin.
5. **« Publier »** (`publier-addon.yml`) : ici l'étape varie le plus.
   - Version lue dans `package.json` (et non `config.yaml`).
   - **Si Vercel déploie déjà `main` par son intégration Git**, « Publier » se
     réduit à : tag `vX.Y.Z` + release GitHub (section du `CHANGELOG.md`) +
     libération du verrou. Vérifier comment le projet est réellement déployé
     avant de décider, et si un check Vercel doit faire partie du ruleset.
   - Garder l'idempotence : si la release `vX.Y.Z` existe, ne rien refaire.
6. **Le changeset est-il exigé partout ?** Dans le dépôt de référence, il
   l'est dès que le dossier de l'app change. À décider avec le propriétaire
   pour ce dépôt (tout `src/` ? tout sauf `docs/` ?).

## 7. Ce qui a été vérifié, et ce qui ne l'a pas été

Éprouvé sur une vraie PR
([#22](https://github.com/poupouproject/tache-et-point-enfants/pull/22),
release [`v1.5.2`](https://github.com/poupouproject/tache-et-point-enfants/releases/tag/v1.5.2)) :
vérifications de PR → `ready` → verrou pris → commit de version → retests →
feu vert → **fusion automatique par GitHub** → « Publier » sur `main` → images,
tag, release avec la section du journal → verrou libéré.

**Pas encore éprouvé en réel** (écrit, non exécuté) :

- deux PR `ready` en même temps (file d'attente, relance de la suivante) ;
- un échec pendant la préparation (verrou libéré, `ready` retiré, commentaire) ;
- un commit poussé après `ready` (label retiré).

À tester avec des PR jetables (changeset vide) avant de compter dessus.
`actionlint` et `shellcheck` passent sur les fichiers de référence.

## 8. Constaté dans `levis-biblio` (PR #14)

Contrairement au § 3.3, le commit de version poussé avec `GITHUB_TOKEN` **a
émis `synchronize`** (exécution attribuée à la personne qui avait posé
`ready`) : « Vérifier la PR » et la porte ont tourné sur ce commit. Effets
observés, et corrections apportées :

- La porte a pris ce commit pour un commit humain et retiré `ready` →
  `porte.sh` ignore désormais un `synchronize` dont le commit est de
  `github-actions[bot]`, et ne relance pas de préparation si la PR tient déjà
  le verrou.
- « Un changeset accompagne la branche » a échoué : le commit de version
  supprime les changesets, absents alors du diff de la branche → la
  vérification cherche les changesets ajoutés **commit par commit**
  (`git log --diff-filter=A`).
- `gh workflow run` répond 422 tant que `pret-a-publier.yml` n'est pas sur
  `main` (amorçage) → `suivante.sh` n'en fait plus un échec, et écarte la PR
  qui vient de perdre `ready` (liste des labels pas encore à jour).
- Changesets **v3** sort en erreur (« No unreleased changesets found »)
  quand aucun changeset n'attend, alors que la v2 se contentait d'un
  avertissement : c'est le cas quand on repose `ready` après une préparation
  qui a déjà calculé la version → la préparation saute `npm run version` si
  `.changeset/` ne contient que son README.
- `ready` restait sur les PR fusionnées (#14, #15, #43) : sur `closed`, la
  porte retirait le verrou, et `publier.yml`, quelques secondes plus tard, ne
  retirait `ready` qu'aux PR fusionnées portant **encore** le verrou, donc
  aucune → la porte retire maintenant `ready` elle-même sur `closed`.
