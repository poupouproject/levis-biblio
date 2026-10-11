# Documentation Fonctionnelle : Recherche Sémantique Intelligente
**Projet :** Portail Citoyen Open Source – Bibliothèque de Lévis
**Version :** 1.0 (Mars 2026)
**Statut :** Preuve de Concept (POC)

---

## 1. Résumé Exécutif
L'objectif est de moderniser l'accès au catalogue de la bibliothèque (livres, DVD, jeux, CD) en remplaçant la recherche par mots-clés rigide par une **recherche sémantique (IA)**. Le système doit comprendre l'intention de l'usager, même si les termes exacts ne sont pas présents dans le titre, tout en garantissant une infrastructure à coût nul et une confidentialité totale des données.

## 2. Public Cible (Personas)
* **L'Enfant (Arnaud, 10 ans) :** Cherche avec des concepts flous ("une histoire de pirate avec des bateaux volants").
* **Le Parent (Valérie) :** Cherche des recommandations thématiques ("activités pour occuper les enfants un jour de pluie").
* **Le Citoyen Aîné :** Peut faire des fautes de frappe ou utiliser des synonymes que le catalogue actuel ne reconnaît pas.

## 3. Description de la Fonctionnalité
### 3.1 Expérience de Recherche Hybride
L'interface de recherche propose deux niveaux de résultats simultanés :
1.  **Résultats Classiques :** Liste standard basée sur la correspondance exacte des mots (SQL ILIKE).
2.  **Boîte à Suggestions IA :** Un encadré en haut de page qui "explique" les meilleurs résultats trouvés par l'IA en fonction du contexte de la recherche.



### 3.2 Catalogue Unifié
Le système traite tous les types de médias de la ville de manière uniforme dans une base de données flexible (JSONB) :
* Livres (Auteurs, ISBN)
* DVD/Blu-ray (Réalisateurs, Acteurs)
* Jeux de société (Âge, Durée)
* CD Audio (Artistes, Genre)

---

## 4. Architecture et Flux de Données
Le système repose sur quatre piliers technologiques : **Next.js** (Frontend), **Supabase** (Base de données), **Google Gemini** (Moteur IA) et **GitHub Actions** (Automatisation).

### 4.1 Flux d'acquisition (Back-end)
1.  **Scraping :** Récupération périodique des nouveautés sur le site officiel de la Ville de Lévis.
2.  **Vectorisation (Embedding) :** Traduction des descriptions textuelles en coordonnées mathématiques (vecteurs) via l'IA.
3.  **Stockage :** Sauvegarde des données et des vecteurs dans Supabase.



### 4.2 Flux de Consultation (Front-end)
1.  L'usager saisit sa requête en langage naturel.
2.  Le système convertit la requête en vecteur.
3.  Une recherche de "proximité cosinus" est effectuée dans Supabase pour sortir les 5 items les plus pertinents.

---

## 5. Avantages Stratégiques pour la Ville
| Pilier | Bénéfice pour la Municipalité |
| :--- | :--- |
| **Accessibilité** | Permet aux enfants et aux néophytes de trouver du contenu sans connaître le jargon bibliothécaire. |
| **Souveraineté** | Les données des citoyens ne sont jamais croisées avec des profils publicitaires; seules les descriptions publiques des livres sont traitées. |
| **Coût d'opération** | Architecture "Serverless" et Open Source coûtant virtuellement 0$ en frais d'infrastructure pour la phase de démarrage. |
| **Innovation** | Positionne Lévis comme un leader dans l'utilisation éthique et pratique de l'intelligence artificielle au service du citoyen. |

---

## 6. Contraintes et Gouvernance
* **Fréquence de mise à jour :** Automatisée via GitHub Actions (ex: chaque nuit à 3h00).
* **Confidentialité :** Aucune donnée nominative (nom, adresse, historique d'emprunt) n'est envoyée aux APIs d'IA. Seuls les termes de recherche anonymisés sont traités.
* **Scalabilité :** Le passage à une version payante de Supabase ou Gemini est possible si le volume de citoyens dépasse les limites gratuites, sans changement de code.

---

> **Note de l'analyste :** Ce document démontre que la technologie n'est pas une fin en soi, mais un levier pour améliorer l'expérience utilisateur tout en respectant les budgets publics.
