# Personas du MVP — Parfumerie SAM

## Cedric — Administrateur

**Objectif :** maintenir le catalogue, les utilisateurs, les lieux et les autorisations sans intervenir dans les opérations quotidiennes.

**Voit et utilise :** Produits, Équipe, Boutiques, Flux autorisés, Contrôle et journal administratif.

**Ne fait pas :** réceptionner du stock, déclarer une recette ou valider un mouvement à la place d’un acteur opérationnel.

## Samuel — Patron

**Objectif :** piloter le réseau, détecter les anomalies et prendre les décisions exceptionnelles.

**Voit et utilise :** stocks de tous les détenteurs, historique des flux, mouvements financiers, anomalies et décisions à traiter.

**Ne fait pas :** préparer les expéditions ou modifier les déclarations historiques.

## Yakin — Magasinier

**Objectif :** connaître le stock autorisé, recevoir les livraisons fournisseurs et préparer les flux entre détenteurs.

**Voit et utilise :** uniquement ses sites autorisés, arrivages, demandes, expéditions, confirmations et stock réseau autorisé.

**Particularité :** il peut cumuler plusieurs sites et doit toujours vérifier l’espace actif.

## Georges — Gérant

**Objectif :** exploiter sa boutique, demander et réceptionner du stock, puis gérer la caisse du point de vente.

**Voit et utilise :** sa boutique, ses réceptions, demandes, retours, recettes, remises reçues et demandes de retrait.

**Ne voit pas :** les stocks, mouvements ou caisses des boutiques auxquelles il n’est pas affecté.

## Joel — Déstockeur mobile

**Objectif :** recevoir les produits à déstocker, retourner les invendus et confirmer les remises d’argent.

**Voit et utilise :** uniquement son stock mobile, ses transferts, retours et remises.

**Particularité :** ce rôle est exclusif, sans site, et l’argent est toujours remis à un point physique autorisé.

## Règle commune de traçabilité

Chaque flux conserve sa date de création puis, pour chaque étape, le prénom de l’acteur, l’action réalisée, la date et l’heure, les quantités ou montants et le commentaire éventuel. L’historique n’est jamais réécrit.
