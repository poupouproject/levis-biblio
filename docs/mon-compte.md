# Mon dossier — compte usager des Bibliothèques de Lévis

> **Statut : implémenté** (branche `v1-mobile`). Lecture validée sur un vrai compte ; actions d'écriture à valider (voir §7).
> Analyse du portail : SirsiDynix Enterprise `5.1294` (`levi.ent.sirsidynix.net`), octobre 2026.

## 1. Fonctionnalités

| Section | Route | Lecture | Actions |
|---|---|---|---|
| Connexion | `/compte/connexion` | — | Ouvrir une session (carte ou identifiant + NIP) |
| Sommaire | `/compte` | Alertes (retards, réservations prêtes), compteurs, prochains retours | — |
| Emprunts | `/compte/emprunts` | Titre, auteur, cote, couverture, date de retour, renouvellements, alertes | Renouveler un ou plusieurs documents |
| Réservations | `/compte/reservations` | Statut, lieu de retrait, rang dans la file, échéance, couverture | Annuler, suspendre (dates), réactiver, changer de succursale |
| Historique | `/compte/historique` | Emprunts passés groupés par année, filtre local | Lien vers le catalogue |
| Amendes | `/compte/amendes` | Montant dû, détail, amendes accumulées, total payé | Paiement : renvoi au portail officiel |
| Profil | `/compte/profil` | Coordonnées (lecture seule) | Succursale par défaut, langue, historique on/off ; NIP : renvoi au portail |

Hors de portée, volontairement : paiement en ligne, changement de NIP, placer une nouvelle réservation (part d'une fiche du catalogue, protégée par Cloudflare).

## 2. Architecture

```
Navigateur ──(POST /compte/connexion/ouvrir : carte + NIP)──▶ Next.js (serveur)
                                                   │ ouvre la session sur le portail (fetch)
                                                   │ oublie carte et NIP
           ◀── 303 /compte + cookie scellé `lb_dossier` ┘  (cookies du portail + sdcsrf, chiffrés)
Navigateur ── GET /compte/emprunts ──▶ Server Component → withAccount() → LevisClient → cheerio → rendu
Navigateur ── Server Action renewAction(codes-barres) ──▶ portail → relecture → résultat par document
```

- **Aucune BD, aucun cache serveur.** Le seul état est le cookie `lb_dossier` : `iron-session` (chiffré + signé), `httpOnly`, `SameSite=Strict`, `Secure` en production, `Path=/compte`, durée 30 min renouvelée à chaque action. Il ne contient ni la carte ni le NIP.
- **Connexion et déconnexion** : envois de formulaire classiques vers des routes (`/compte/connexion/ouvrir`, `/compte/deconnexion`), suivis d'une redirection 303 **relative**. C'est le parcours que reconnaissent les gestionnaires de mots de passe, il marche sans JavaScript, et la déconnexion reçoit toujours le cookie (chemin sous `/compte`) depuis n'importe quelle page. Ne jamais construire une redirection à partir de `request.url` : en dev, elle pointerait vers `localhost`.
- **Lectures** : Server Components + `withAccount()` (`src/lib/account/dal.ts`). Session expirée côté portail → `/compte/expiree`, qui supprime le cookie périmé (une page ne peut pas le faire) puis renvoie à la connexion ; sinon, boucle de redirections.
- **Écritures** : Server Actions (`src/app/compte/actions.ts`), protégées par la vérification d'origine intégrée de Next. Toutes les entrées sont revalidées côté serveur (formats de clés, codes de succursale, dates).
- **Menu de compte** : `GET /compte/session` ne renvoie que le prénom, pour l'en-tête ; le reste du site reste statique.
- **Couvertures et ISBN en streaming** : le portail met 2 à 5 s à les fournir (l'ISBN n'existe que dans l'adresse de la couverture). Les listes s'affichent en ~0,4 s ; couvertures et ISBN arrivent ensuite (`use()` + `Suspense`, `StreamedCover`, `StreamedIsbn`) et restent en mémoire dans l'onglet (`coverCache.ts`).
- **Squelettes** : `<SkeletonScope>` affiche le vrai composant en squelette pendant le chargement.
- Tout le code qui touche la session importe `server-only`.

### Fichiers

```
src/lib/levis/                 Accès au portail (serveur seulement)
  config.ts                    URL, User-Agent
  branches.ts                  succursales : codes, adresses, heures, itinéraire (relevé levis.ca)
  errors.ts                    InvalidCredentials, SessionExpired, Upstream, Parse
  tapestry.ts                  encodeTapestry, addPathParams, zones JSON, snapshotForm, CSRF
  client.ts                    LevisClient : jarre de cookies, redirections, délais, sdcsrf
  auth.ts                      login / logout
  account.ts                   lectures + actions (renouveler, réservations, succursale, préférences)
  parsers/*.ts                 HTML → types du domaine (fonctions pures, testées)
src/lib/account/
  session.ts                   cookie scellé
  login.ts                     validation, limite de tentatives, ouverture de session
  dal.ts                       requireAccount, withAccount
  rate-limit.ts                limite des tentatives de connexion
  origin.ts                    contrôle d'origine des formulaires (Sec-Fetch-Site, repli Origin)
  redirect.ts                  redirections 303 relatives
  format.ts                    dates relatives, échéances (partagé client/serveur)
src/app/compte/                pages, actions, chargement, erreurs
src/components/account/        composants UI
src/types/account.ts           types du domaine
```

## 3. Protocole du portail (confirmé)

Base : `https://levi.ent.sirsidynix.net/client/fr_CA/accueil`. Seuls les chemins `search/account…` et `search/patronlogin…` sont utilisés ; aucun n'est protégé par Cloudflare. Les chemins de recherche, de fiche et de disponibilité (protégés) ne sont **jamais** appelés.

**Mécanismes communs**
- `sdcsrf` : jeton de session, renvoyé dans le corps et dans l'en-tête `sdcsrf` des requêtes AJAX.
- `t:formdata` : état opaque d'un formulaire ; toujours relire le formulaire juste avant de le soumettre.
- Zones AJAX : `POST {composant}?` avec `t:zoneid=…`, en-têtes `X-Requested-With: XMLHttpRequest`, `X-Prototype-Version: 1.7`. Réponse JSON `{ content, zones, inits }` ; `inits[].evalScript` et `inits[].linkZone` portent les URL d'événements et les zones liées aux formulaires.
- Les zones se chargent directement avec la session : inutile de charger la page `search/account` (~200 Ko) avant.
- Dates affichées `AA-MM-JJ` ; dates saisies (suspension) `yyyy/m/d`. Courriel du profil masqué par Cloudflare (`data-cfemail`, XOR).

**Connexion** : `GET search/patronlogin/…` → `#loginPageForm` → `POST` AJAX avec `j_username`, `j_password`, `t:submit=["submit_0","submit_0"]` → succès : `{"redirectURL": "…redirectafterlogin…"}` ; échec : pas de `redirectURL`. Le portail accepte le numéro de carte ou l'identifiant d'usager alphanumérique.

**Lectures**

| Donnée | Composant | `t:zoneid` | Temps |
|---|---|---|---|
| Emprunts | `account.accountnonmobile.checkouts.librarycheckoutsaccordion` | `libraryCheckoutsAccordion` | ~90 ms |
| Réservations | `account.accountnonmobile.holds.libraryholdsaccordion` | `libraryHoldsAccordion` | ~80 ms |
| Historique | `account.accountnonmobile.checkouts.checkouthistoryajax` | `checkoutHistoryAjax` | ~100 ms |
| Amendes | `account.accountnonmobile.fines.paymentserviceajax` | `paymentServiceAjax` | ~70 ms |
| Couvertures emprunts | `…checkouts.any:loadcheckoutsextras/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:` | — | 2,5–3 s |
| Couvertures réservations | `…holds.any:loadholdsextras/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:` | — | ~5 s |
| Profil, préférences | page `search/account` | — | ~700 ms |

Couvertures : `{ array: [{ identifier, image, itemID? }] }`, `identifier` = code-barres (emprunts) ou numéro de réservation. `image` = `…/btlffile/{ISBN}/cover`.

**Actions**

| Action | Mécanisme |
|---|---|
| Renouveler | Formulaire de la zone emprunts ; cases nommées par position (`checkbox`, `checkbox_0`…) associées au code-barres sur une liste fraîchement chargée ; `t:submit` + `t:zoneid` (zone liée). |
| Annuler / suspendre / réactiver | Formulaire `HoldsSelectionForm_*` : `myHolds_holdslistnonmobile_action` = `DELETE` / `SUSPEND` / `CANCEL_SUSPEND`, `…_ids` = clés `"<réservation>\|null"` (table fournie par `new HoldsList(…)`), `…_startDate` / `…_endDate` en `yyyy/m/d`. |
| Changer de succursale | 1) `POST …:editpickuplibraries/…/<clé encodée>` (`t:zoneid=placeHoldZone`) → formulaire ; 2) `POST …placeholdnonmobile:holditems/true/<ids>/<succursales>/<cotes>/<messages>/null` (listes séparées par `\|\|\|`, encodées Tapestry) → `{ reload, messages: { id: html } }`. |
| Préférences | Formulaire classique `#preferencesForm` (`defaultLanguage`, `defaultTab`, `pickupLibrary`, `showCheckoutHistory`, `updatePrefs`). |

Après chaque action, la liste est relue et le résultat de chaque document est déduit de l'état réel (date de retour, présence, statut, succursale) plutôt que du texte du portail.

**Succursales** : AMF Anne-Marie-Filteau (St-Nicolas) · AR Albert-Rousseau (St-Étienne de Lauzon) · CV Croque-Volumes (St-Rédempteur) · FM Francine-McKenzie (St-Jean-Chrysostome) · JG Jean-Gosselin (Charny) · LC La Clé (Breakeyville) · LP La Pintellect (Pintendre) · LV Lauréat-Vallière (St-Romuald) · SD Saint-David - Lévis · PGR Pierre-Georges-Roy (Lévis).

## 4. Sécurité et vie privée

- [x] Carte et NIP uniquement dans un POST vers `/compte/connexion/ouvrir`, gardés en mémoire le temps de la connexion, jamais journalisés. Après une erreur, la carte est préremplie via un cookie `httpOnly` de 2 min, jamais dans l'URL.
- [x] Contrôle d'origine des formulaires : `Sec-Fetch-Site: same-origin` exigé ; repli sur `Origin` quand l'en-tête est absent (HTTP local) ; `Origin: null` refusé dans le repli.
- [x] Cookie scellé `httpOnly; SameSite=Strict; Path=/compte`, clé `LEVIS_SESSION_SECRET` (≥ 32 caractères).
- [x] Limite de tentatives : 5 par carte (hachée) et 10 par IP sur 15 min, en mémoire par instance.
- [x] Déconnexion : fermeture de la session du portail + destruction du cookie.
- [x] `/compte/*` : `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`.
- [x] Fixtures de test synthétiques : aucune donnée personnelle dans le dépôt.
- [x] User-Agent honnête (`LevisBiblio/1.0`), accepté par le portail.
- [ ] Production : règle de limitation du pare-feu Vercel sur `/compte/connexion` (la limite en mémoire ne couvre pas plusieurs instances).
- [ ] Usage public : politique de confidentialité, personne responsable (Loi 25), **accord de la Ville**.

## 5. Configuration

| Variable | Rôle |
|---|---|
| `LEVIS_SESSION_SECRET` | Obligatoire. Clé du cookie scellé (voir `.env.example`). |
| `LEVIS_USER_AGENT` | Optionnel. Remplace le User-Agent envoyé au portail. |
| `MON_COMPTE_LEVIS`, `MON_COMPTE_LEVIS_PASS` | Développement seulement : compte pour `npm run test:live`. |

## 6. Tests

- `npm run test:unit` : parseurs, utilitaires Tapestry, formats, limite de tentatives (fixtures synthétiques).
- `npm run test:live` : contre le vrai portail, **lecture seule** (connexion, emprunts, réservations, historique, amendes, profil, refus d'une carte fictive). À lancer après une mise à jour du portail pour détecter un changement de structure. Jamais en CI.

## 7. À valider

| Point | Comment |
|---|---|
| Renouvellement réel (succès, refus pour réservation d'un autre usager, limite atteinte) | Renouveler un document admissible depuis l'interface |
| Suspendre puis réactiver une réservation | Suspendre quelques jours, puis réactiver |
| Changer de succursale | Changer, vérifier, remettre la succursale d'origine |
| Annuler une réservation | Sur une réservation dont on n'a plus besoin |
| Statuts rares (en transit, prête, suspendue) et leur libellé exact | Observer au fil du temps ; ajuster `holdStatusFrom` |
| Durée de session du portail | Laisser la session inactive et observer l'expiration |
| Session et adresses IP variables de Vercel | Premier déploiement |

## 8. Pour la Ville

La démonstration se fait avec un compte réel. Pour une ouverture au public, l'idéal est une authentification officielle (connexion via la Ville ou jeton d'usager des services web Symphony) : l'application ne verrait alors jamais le NIP, et les appels passeraient par une API stable plutôt que par le HTML du portail.
