# levis-biblio

## 0.8.0

### Nouveautés

- Nouvelle page « Confidentialité », accessible depuis le pied de page : ce que le site fait (et ne fait pas) de vos renseignements, les deux cookies de « Mon dossier », et qui détient vos données.

## 0.7.1

### Correctifs

- La pastille « Démo » peut rester affichée même quand Mon dossier se connecte au vrai portail des bibliothèques.

## 0.7.0

### Nouveautés

- La recherche interroge la base du catalogue : elle porte sur tous les documents, répond dès la première visite, et les auteurs écrits de plusieurs façons (« Greg » et « Michel Greg ») sont réunis.
- Une faute de frappe ne mène plus à une page vide : sans résultat exact, la recherche propose les titres les plus proches (« harry poter » trouve Harry Potter).

### Correctifs

- Les titres et les auteurs aux lettres particulières (« Guðmundsson », « Vardø », « Hałasa ») se trouvent en tapant leur forme courante (« gudmundsson », « vardo »).
- Plus de livres sont rattachés à leur série : les tomes notés « [2] », « : 3 », « tome 4 » ou « ! 15 » dans le catalogue sont maintenant reconnus, et des tomes qui étaient confondus en une seule œuvre sont séparés.

## 0.6.1

### Correctifs

- Notifications : le thème sombre vient du CSS. La notification du mode démonstration s’affiche bien au premier chargement, et sombre dès ce moment.
- Notification du mode démonstration : message reformulé, plus positif sur la démarche avec la Ville de Lévis.

## 0.6.0

### Nouveautés

- La loupe de l’en-tête ouvre la recherche dans un panneau flottant, prêt à écrire, depuis n’importe quelle page. Sur téléphone et tablette, la barre de l’accueil l’ouvre aussi, et le texte saisi est conservé quand on le referme.

  <img src="https://raw.githubusercontent.com/poupouproject/levis-biblio/main/docs/nouveautes/recherche-flottante-mobile.png" alt="Recherche flottante sur téléphone : le champ en haut de l’écran, les suggestions en dessous" width="300"> <img src="https://raw.githubusercontent.com/poupouproject/levis-biblio/main/docs/nouveautes/recherche-flottante-ordinateur.png" alt="Recherche flottante sur ordinateur : un panneau centré au-dessus de la page" width="600">

### Correctifs

- Sur téléphone et tablette, le clavier ne cache plus les suggestions de recherche : le champ remonte sous l’en-tête et la liste s’ajuste à la partie visible de l’écran.

## 0.5.0

### Nouveautés

- En-tête : pastille « Bêta » à côté du nom du site, et pastille « Démo » lorsque le mode démonstration est activé.
- Mode démonstration : une notification de 20 s explique, au premier chargement et à chaque clic sur la pastille « Démo », que les données sont fictives en attendant les autorisations de la Ville, et invite à contribuer sur GitHub.

### Correctifs

- Icône du site : le livre doré de l’en-tête remplace l’icône par défaut de Next.js.
- Pastille « Démo » : un point animé rappelle qu’on est en démonstration, même si la notification a été fermée (immobile si les animations sont réduites).
- Notifications : plus larges sur ordinateur, et message du mode démonstration plus compact sur mobile.
- Notification du mode démonstration : elle respecte le thème sombre dès le premier chargement.

## 0.4.0

### Nouveautés

- Fiche d'une œuvre : le résumé du livre s'affiche quand Google Livres en a un, avec un lien vers sa fiche Google Livres.

### Correctifs

- Sécurité : Next.js passe à la version 16.4.2, qui corrige une vulnérabilité critique.
- Fiche d'une œuvre : le résumé du livre s'affiche plus souvent et plus vite (accents et guillemets bien rendus, éditions essayées en parallèle, long résumé replié sous « Lire la suite »).

## 0.3.0

### Nouveautés

- Mon dossier : le résultat des actions s'affiche en notifications (10 secondes, avec une barre de temps restant, en pause au survol). Pour un résultat mixte, une notification pour les documents renouvelés et une pour les refus, avec leur motif et la date de retour. Renouveler un emprunt ou modifier une réservation n'affiche plus « session expirée » à tort.

## 0.2.0

### Nouveautés

- Recherche dans le catalogue et nouvelle page d'accueil : suggestions dès la saisie (séries, auteurs, œuvres), éditions regroupées en œuvres, séries réunies tome par tome, filtres par type, année, disponibilité et succursale, fiches d'œuvre et de série. Disponibilités simulées en attendant l'accès officiel.

## 0.1.1

### Correctifs

- Versions numérotées, journal des changements et releases GitHub publiées à chaque fusion.
