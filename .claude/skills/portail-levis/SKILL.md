---
name: portail-levis
description: Tester, déboguer ou utiliser le vrai portail SirsiDynix des bibliothèques de Lévis avec un vrai compte (Mon dossier) : lecture des emprunts et réservations, renouvellement, capture d'une réponse brute du portail. À lire avant toute requête vers levi.ent.sirsidynix.net ou tout `npm run test:live`.
---

# Le vrai portail des bibliothèques de Lévis

Le code d'accès est dans `src/lib/levis/` (client, auth, account, parseurs). Le compte de
test est celui du propriétaire du dépôt : `MON_COMPTE_LEVIS` et `MON_COMPTE_LEVIS_PASS`
dans `.env.local`. C'est un **vrai dossier de bibliothèque**.

## Règles

- **Lecture seule par défaut.** Une action qui modifie le dossier (renouveler, annuler,
  suspendre, changer de succursale, préférences) seulement si le propriétaire du compte la
  demande explicitement, sur le document qu'il nomme. Jamais pour « tester ».
- Pour observer une réponse du portail sans rien changer, soumettre le formulaire **sans
  aucune case cochée** : même réponse (`{"redirectURL": …}`), aucun effet sur le compte.
- Ne jamais afficher, journaliser ni écrire le numéro de carte ou le NIP.
- Seuls les chemins `search/account…` et `search/patronlogin…` sont utilisés. La recherche
  et les fiches sont protégées par Cloudflare : ne jamais tenter de les contourner.
- Toujours fermer la session (`logout`) en fin de test.

## Méthode : un test live temporaire

Passer par Vitest, qui charge `.env.local` et résout les alias `@/`.

1. Créer `tests/live/_tmp-<sujet>.live.test.ts` (préfixe `_tmp-` : jetable).
2. `login(...)` → `new LevisClient(state)` → fonctions de `@/lib/levis/account` →
   `logout(client.toState())` dans un `finally`.
3. **Écrire le résultat dans un fichier JSON du dossier scratchpad** (`writeFileSync`) et le
   lire ensuite : la sortie `console.log` des tests live n'apparaît pas.
4. Lancer : `npx vitest run --config vitest.live.config.mts tests/live/_tmp-<sujet>.live.test.ts`
5. **Supprimer le fichier `_tmp-`** une fois fini : il ne doit jamais être commité.

Avant / après une action : relire l'état (ex. `getCheckouts`) avant et après, et comparer.
Le succès d'une action se déduit de cette relecture, jamais de la réponse du portail
(identique en cas de refus).

## Garder une trace

Un état intéressant et éphémère (ex. un livre prêt à récupérer) peut être sauvegardé dans
`.snapshots/` : dossier exclu de git localement (`.git/info/exclude`), car il contient des
données personnelles. Ne jamais commiter de vraies données de compte. Les fixtures de
`tests/unit/fixtures/` sont synthétiques.

## Constats connus

- Après une action, le portail répond `{"redirectURL": "…/search/account/1/0?"}` : c'est une
  demande de recharger Mon dossier, pas une expiration (`LevisClient.submitZone`).
- Une réservation prête n'a pas de case à cocher (`canCancel: false`) ; son échéance est
  dans le statut (« Retirer avant le : AA-MM-JJ »).
- Le portail ne donne pas le motif d'un refus de renouvellement (en pratique : réservé par
  un autre usager).
- Les serveurs infonuagiques (Vercel) sont bloqués : en ligne, Mon dossier tourne en mode
  démonstration (`LEVIS_DEMO=1`).
