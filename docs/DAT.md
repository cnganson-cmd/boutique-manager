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
| `supplier-arrivals-ux.js` | réception des grosses livraisons fournisseur et consultation des bons |
| `flow-inboxes.js` | boîtes de traitement, réception et confirmation du stock |
| `money-ux.js` | recettes, remises, retraits et décisions financières |
| `admin-console.js` | utilisateurs, profils, responsabilités, lieux et journal |
| `admin-extras.js` | comptes de connexion, filtres, imports/exports, impacts et maintenance du catalogue |
| `supabase/functions/admin-user-access` | invitations et récupération de compte via Auth Admin, après vérification JWT et contrôle Administrateur |
| `admin-routes.js` | configuration des routes de stock et d’argent |
| `catalog-ux.js` | consultation du catalogue |
| `catalog-admin.js` | création sécurisée des produits, références et conditionnements |
| `admin-extras.js` | modification des références et gestion de leurs photos dans Supabase Storage |
| `catalog-admin.js` | validation des imports externes et rattachement fabricants/fournisseurs |

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

### Arrivage fournisseur

- Le numéro du bon de livraison fournisseur est saisi et conservé sans être remplacé.
- La base génère un numéro interne `ARR-AAAA-NNNNNN` au moment de la validation.
- Un même numéro de bon ne peut être enregistré deux fois pour un même fournisseur.
- La réception est limitée aux sites sur lesquels l’acteur possède `RECEPTIONNER_STOCK`.
- Après sélection du fournisseur, `consulter_references_fournisseur_reception` ne renvoie que les références actives des produits qui lui sont rattachés dans `produits_fournisseurs`.
- Un trigger contrôle à nouveau ce rattachement lors de l’écriture : une référence étrangère au fournisseur est refusée même si l’interface est contournée.
- Chaque ligne distingue quantité attendue, reçue, abîmée et réellement entrée en stock.
- L’arrivage, ses lignes, le crédit de stock, les mouvements liés et le journal d’audit sont écrits dans la même transaction PostgreSQL.
- `operation_client_id` rend un double-clic ou une reprise réseau idempotent.
- L’Administrateur crée les fournisseurs et gère leurs rattachements depuis les fiches produit ; la fiche fournisseur présente la liste consolidée des produits concernés.

## 7. Sécurité

- RLS active sur les tables exposées.
- Les coordonnées personnelles (`nom_famille`, `civilite`, `email`, `telephone`) restent dans `utilisateurs` : la politique RLS autorise l’Administrateur global à consulter toutes les fiches et chaque utilisateur uniquement sa propre fiche.
- Le champ historique `nom` conserve le prénom d’affichage pour la compatibilité. Les RPC complètes synchronisent `nom` et `prenom`, tandis que les écrans opérationnels n’affichent que ce prénom.
- La clé `service_role` n’est jamais envoyée au navigateur. La fonction Edge `admin-user-access` vérifie le JWT, appelle `est_administrateur_global_courant()` dans le contexte de l’appelant, puis utilise le client privilégié uniquement pour l’opération Auth ciblée.
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
- Les photos de références sont stockées dans le bucket public `product-reference-images`. Les lectures servent au catalogue ; les écritures et suppressions sont protégées par des politiques Storage réservées à l’Administrateur global. La colonne `references_produit.photo_url` conserve l’adresse publique et chaque association ou suppression est journalisée.
- `fabricants` est un référentiel lisible par le catalogue. `fournisseurs`, `produits_fournisseurs` et `candidats_import_catalogue` sont réservés à l’Administrateur global par RLS. Les mutations passent par des RPC qui revérifient le rôle et alimentent `journal_administration`.
- Les données issues du site Lana sont conservées en statut `A_VALIDER`. La création d’un produit, de sa référence et de son SKU reste une décision explicite de l’administrateur.
- À partir de 700 px, l’espace tablette utilise jusqu’à trois colonnes et conserve la navigation tactile inférieure.
- À partir de 1100 px, l’espace PC utilise une navigation latérale, des listes sur deux colonnes et un tableau de bord élargi.
- Les écrans utilisent des termes métier génériques : aucune règle ne dépend du nom d’un utilisateur ou d’une boutique.

## 10. Passage vers Test/MVP

Le passage est conditionné par : recette fonctionnelle complète, validation UI/UX métier, absence de données de simulation, revue des avertissements de sécurité acceptés et accord explicite du responsable produit.
