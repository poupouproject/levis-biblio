---
name: feuille-de-route
description: Gérer les issues de LévisBiblio et le projet GitHub « LévisBiblio — Feuille de route » : créer une issue (jalon, labels, phase), la lier à une pull request, commenter l'avancement, la fermer, mettre à jour son statut dans le projet. À lire avant de créer, commenter ou fermer une issue, ou quand une PR résout ou avance une tâche.
---

# Issues et feuille de route

Chaque tâche est une issue du dépôt `poupouproject/levis-biblio`, rattachée à un **jalon**
(une phase) et ajoutée au **projet** https://github.com/users/poupouproject/projects/3
(numéro 3, propriétaire `poupouproject`). Le dépôt est public : issues et commentaires aussi.

## Référentiel

**Jalons** (titre exact pour `--milestone`) :
1. `Phase 1 — Démarche auprès de la Ville`
2. `Phase 2 — Prêt pour le public`
3. `Phase 3 — Pilote encadré « Mon dossier »`
4. `Phase 4 — Catalogue officiel`
5. `Phase 5 — Imprimé et numérique réunis`
6. `Phase 6 — Au-delà du livre`

**Labels de domaine** : `démarche-ville`, `conformité`, `mon-dossier`, `catalogue`,
`numérique`, `infra`. **Labels de nature** : `bug`, `enhancement`, `documentation`.
Une issue porte au moins un label de domaine. `ready` et `publication-en-cours` sont réservés
aux PR et gérés par la CI : jamais sur une issue.

**Champs du projet** : `Status` (`Todo`, `In Progress`, `Done`) et `Phase`
(`1 — Démarche auprès de la Ville` … `6 — Au-delà du livre`, même numéro que le jalon).

## Cycle de vie

1. **Créer** : titre à l'infinitif ou nominal, en français ; corps qui dit le besoin et le
   résultat attendu (liste de cases à cocher si plusieurs étapes).
   ```bash
   gh issue create --title "…" --body "…" --label <domaine> --label <nature> --milestone "<titre du jalon>"
   ```
   Puis l'**ajouter au projet** avec sa phase et `Todo` (voir « Commandes du projet »).
2. **Commencer** : statut `In Progress`.
3. **Pull request** : lier dans la description (voir aussi le skill `publication`) :
   - issue entièrement résolue → `Closes #N` : GitHub la ferme à la fusion ;
   - issue seulement avancée → `Refs #N`, et un **commentaire d'avancement** sur l'issue
     (cases cochées : fait ; non cochées : reste à faire, avec la dépendance s'il y en a).
     Ne pas la fermer.
4. **Travail sans issue** (bogue trouvé en cours de route, amélioration demandée au fil de
   la conversation) : créer l'issue avec jalon et labels, et la lier avec `Closes #N`. Si la
   PR est déjà fusionnée : créer l'issue, la fermer avec
   `gh issue close N --reason completed --comment "Résolu par #PR (version X.Y.Z)."`,
   puis l'ajouter au projet en `Done`.
5. **Fermer** : seulement quand tout ce que l'issue décrit est fait et vérifié. Sinon,
   commenter l'avancement et laisser ouvert. Une issue abandonnée :
   `--reason "not planned"` avec la raison en commentaire.
6. Après fermeture, vérifier que l'élément du projet est en `Done` (le mettre à jour sinon).

## Commandes du projet

Elles demandent la permission `project` du jeton de `gh`. Si `gh` répond
« missing required scopes [read:project] », lancer en arrière-plan
`echo | gh auth refresh -h github.com -s project,read:project`, lire le code à usage unique
dans la sortie et demander au propriétaire de le saisir sur https://github.com/login/device.

```bash
PID=$(gh project view 3 --owner poupouproject --format json --jq .id)
gh project field-list 3 --owner poupouproject --format json   # identifiants des champs et options
ITEM=$(gh project item-add 3 --owner poupouproject --url <url de l'issue> --format json --jq .id)
gh project item-edit --id "$ITEM" --project-id "$PID" --field-id <id Phase> --single-select-option-id <id option>
gh project item-edit --id "$ITEM" --project-id "$PID" --field-id <id Status> --single-select-option-id <id Todo|In Progress|Done>
```

Les identifiants ne sont pas fixes dans ce skill : les lire avec `field-list` au moment de
s'en servir. `item-add` sur une issue déjà présente renvoie l'élément existant.

## À ne pas faire

- Fermer une issue partiellement faite pour « nettoyer ».
- Créer une issue sans jalon ni label de domaine, ou sans l'ajouter au projet.
- Mettre dans une issue des données personnelles, des identifiants, ou le détail d'un
  échange privé avec la Ville (le dépôt est public).
