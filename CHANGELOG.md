# levis-biblio

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
