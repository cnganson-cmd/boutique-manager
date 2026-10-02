# Déploiement et support — Parfumerie SAM

## Environnements

- **DEV** : développement et données de démonstration actuelles.
- **RECETTE** : tests utilisateurs, avec projet Supabase et comptes séparés.
- **PRODUCTION** : socle préparé mais création et publication uniquement après
  validation formelle du MVP en RECETTE.

Ne jamais réutiliser une clé, une base ou un jeu de comptes entre ces environnements.
La procédure complète de promotion est décrite dans `docs/ENVIRONNEMENTS.md`.

## Déploiement du client

Le client est un site statique compatible GitHub Pages. Publier tous les fichiers de la racine, les styles, scripts, le manifeste, le service worker et les ressources de marque sous le même chemin. Conserver les versions `?v=` de `index.html` pour invalider le cache après une modification.

## Configuration Supabase

1. Créer le projet de l’environnement cible.
2. Appliquer les migrations dans l’ordre.
3. Déployer la fonction Edge d’administration des comptes.
4. Configurer les URL de redirection Auth pour le domaine cible.
5. Remplacer uniquement l’URL et la clé publique dans `app.js` ; ne jamais placer de clé secrète dans le client.
6. Exécuter les advisors de sécurité et la recette fonctionnelle.

## Installation utilisateur

L’application est une PWA responsive : mode autonome sur ordinateur, Android, iPhone et iPad. Le cache concerne l’interface statique. Une connexion est requise pour les données de stock et d’argent.

## Diagnostic par un développeur tiers

1. Identifier le rôle, l’espace actif, la page et l’heure du problème.
2. Relever l’identifiant court du flux affiché.
3. Ouvrir **Voir qui a fait quoi et quand** pour contrôler la chronologie métier.
4. Vérifier la console du navigateur et la réponse HTTP Supabase.
5. Contrôler les routes actives et les politiques RLS avant de modifier l’interface.
6. Reproduire en DEV avec un identifiant d’opération neuf ; ne jamais corriger directement une table comptable.

Les modules critiques contiennent un commentaire d’en-tête expliquant leur responsabilité et leur frontière de sécurité. Les tests `tests/*.test.js` constituent le contrôle de non-régression minimal avant publication.
