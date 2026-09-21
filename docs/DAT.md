# Dossier d’architecture technique (DAT)

## 1. Objet

Boutique Manager est une application web interne, mobile-first, destinée à gérer le catalogue, les flux de stock et les flux financiers de Parfumerie SAM.

## 2. Architecture

- **Client** : HTML, CSS et JavaScript sans framework, répartis par domaine fonctionnel.
- **Authentification et API** : Supabase Auth et Data API.
- **Base** : PostgreSQL avec RLS, fonctions RPC métier et journalisation événementielle.
- **Environnement actuel** : Dev uniquement.

Le client ne contient qu’une clé publique Supabase. Aucune clé `service_role` ou secrète ne doit être placée dans le navigateur.

## 3. Modules principaux

| Module | Responsabilité |
|---|---|
| `app.js` | session, appels HTTP, chargement utilisateur et catalogue |
| `ux-shell.js` | contexte global/site/mobile, accueil par rôle et navigation |
| `stock-flow-ux.js` | création des retours, transferts et réapprovisionnements |
| `flow-inboxes.js` | boîtes de traitement, réception et confirmation du stock |
| `money-ux.js` | recettes, remises, retraits et décisions financières |
| `admin-console.js` | utilisateurs, profils, responsabilités, lieux et journal |
| `admin-routes.js` | configuration des routes de stock et d’argent |
| `catalog-ux.js` | consultation du catalogue |
| `catalog-admin.js` | création sécurisée des produits, références et conditionnements |

## 4. Modèle d’autorisation

Les droits sont calculés côté serveur. Le masquage d’un bouton n’est jamais considéré comme une protection suffisante.

- Les rôles ordinaires peuvent se cumuler sur plusieurs sites.
- `DESTOCKEUR` est exclusif, global et sans site.
- Un détenteur de stock est soit un site physique, soit un déstockeur mobile.
- Les routes actives déterminent les mouvements autorisés.
- Une route financière vers un détenteur mobile est refusée.
- Les utilisateurs opérationnels ne voient que les routes sur lesquelles ils peuvent agir.
- Les fonctions sensibles identifient l’acteur à partir de `auth.uid()` et non d’un identifiant fourni par le client.
- Les autorisations financières sont spécifiques à l’action : Gérant et Vendeur peuvent déclarer une recette, tandis que retraits, remises reçues et corrections restent réservés au Gérant.

## 5. Cycle stock

`DEMANDE` → `EN_TRAITEMENT` → `EN_TRANSIT` → contrôle destination → `A_CONFIRMER_MAGASINIER` → `CLOTURE` ou `ANOMALIE`.

Chaque ligne conserve ses événements : décision, déclaration de réception et confirmation. Les écrans lisent cet historique autorisé et non la table interne des mouvements comptables.

## 6. Cycle financier

- **Recette** : déclaration séparée cash/Mobile Money.
- **Retrait** : demande locale puis validation/refus par le Patron.
- **Remise** : saisie par le destinataire physique, confirmation ou contestation par la source, correction possible, puis arbitrage Patron si nécessaire.

Les RPC financières et stock utilisent un identifiant d’opération client pour rendre les reprises idempotentes.

## 7. Sécurité

- RLS active sur les tables exposées.
- Les coordonnées personnelles (`nom_famille`, `civilite`, `email`, `telephone`) restent dans `utilisateurs` : la politique RLS autorise l’Administrateur global à consulter toutes les fiches et chaque utilisateur uniquement sa propre fiche.
- Le champ historique `nom` conserve le prénom d’affichage pour la compatibilité. Les RPC complètes synchronisent `nom` et `prenom`, tandis que les écrans opérationnels n’affichent que ce prénom.
- Accès directs refusés aux tables comptables internes.
- RPC `SECURITY DEFINER` limitées par des contrôles métier internes et des grants explicites.
- `consulter_libelles_detenteurs_accessibles()` ne retourne que les détenteurs directement reliés aux sites ou à l’activité mobile de l’utilisateur ; l’annuaire complet reste fermé.
- Exclusivité du déstockeur protégée par la base.
- Journal d’administration conservé pour les changements sensibles.

## 8. Exploitation et diagnostic

1. Reproduire avec le rôle et le contexte concernés.
2. Vérifier les routes actives visibles par cet acteur.
3. Contrôler le statut du flux et son historique événementiel.
4. Tester une correction dans une transaction avec `ROLLBACK`.
5. Exécuter les advisors Supabase après toute modification DDL/RLS.

## 9. Principes UI et accessibilité

- L’accueil et les actions rapides dépendent du rôle et du contexte sélectionné.
- Les actions tactiles ont une hauteur minimale de 44 px et un focus clavier visible.
- Les champs ont un libellé explicite ; les montants sont contrôlés côté client puis côté serveur.
- Les indicateurs dynamiques sont annoncés aux technologies d’assistance avec `aria-live`.
- Sous 360 px, les cartes passent sur une seule colonne ; les préférences de réduction des animations sont respectées.
- À partir de 700 px, l’espace tablette utilise jusqu’à trois colonnes et conserve la navigation tactile inférieure.
- À partir de 1100 px, l’espace PC utilise une navigation latérale, des listes sur deux colonnes et un tableau de bord élargi.
- Les écrans utilisent des termes métier génériques : aucune règle ne dépend du nom d’un utilisateur ou d’une boutique.

## 10. Passage vers Test/MVP

Le passage est conditionné par : recette fonctionnelle complète, validation UI/UX métier, absence de données de simulation, revue des avertissements de sécurité acceptés et accord explicite du responsable produit.
