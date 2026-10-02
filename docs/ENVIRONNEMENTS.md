# Environnements et promotions

## Principe

Une version est développée en **DEV**, validée en **RECETTE**, puis promue à
l'identique en **PROD**. Une promotion ne doit jamais contenir une correction
ajoutée directement au moment du passage vers l'environnement suivant.

| Environnement | Branche cible | Base | Application | État actuel |
|---|---|---|---|---|
| DEV | `develop` | Supabase DEV | SAM Dev | active |
| RECETTE | `test` | Supabase RECETTE | SAM Recette | active |
| PROD | `main` | Supabase PROD dédiée | Parfumerie SAM | préparée, désactivée |

Les noms de branches constituent la cible. Tant que les déploiements séparés ne
sont pas raccordés, la publication GitHub Pages existante reste transitoire.

## Garde-fous PROD

- `config-prod.example.js` ne contient que des marqueurs et n'est chargé par
  aucune page.
- Aucun projet Supabase PROD, URL PROD ou compte PROD n'est créé à ce stade.
- Aucun déploiement PROD ne doit être automatisé avant une validation écrite de
  la recette fonctionnelle.
- Les variables PROD devront être stockées dans la plateforme de déploiement,
  jamais dans le dépôt.
- Le déploiement doit échouer si un marqueur `__SUPABASE_PROD_*__` subsiste.

## Promotion DEV vers RECETTE

1. Exécuter tous les tests `tests/*.test.js` et `git diff --check`.
2. Enregistrer le numéro ou le SHA de la version candidate.
3. Fusionner la version candidate de `develop` vers `test` sans autre changement.
4. Appliquer les migrations manquantes à Supabase RECETTE dans l'ordre.
5. Vérifier Auth, RLS, Storage, fonctions Edge et redirections.
6. Déployer RECETTE et exécuter la recette fonctionnelle avec les personas MVP.
7. Noter les anomalies ; toute correction repart de DEV.

## Promotion RECETTE vers PROD — future

1. Obtenir la validation formelle du MVP et figer le SHA testé.
2. Créer l'organisation et le projet Supabase PROD.
3. Appliquer toutes les migrations sur une base vide.
4. Configurer Auth, Storage, fonctions Edge, e-mails et sauvegardes.
5. Injecter la configuration publique PROD dans le déploiement sécurisé.
6. Fusionner exactement le SHA validé de `test` vers `main`.
7. Effectuer un contrôle à blanc, puis autoriser explicitement la publication.
8. Tester connexion, lecture seule, transaction contrôlée et journalisation.

## Retour arrière

Le retour arrière de l'interface redéploie la dernière version validée. Une
migration de données ou comptable ne se corrige jamais par suppression directe :
elle nécessite une migration compensatrice testée d'abord en DEV puis RECETTE.

## Coûts

DEV et RECETTE restent sur les offres gratuites tant que leurs limites le
permettent. Le socle PROD ne génère aucun coût tant qu'aucun projet Supabase et
aucun déploiement PROD ne sont activés.
