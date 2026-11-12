# Changements SAM Operations — boutique-dev — 12 novembre 2026

## Portée
Modifications appliquées exclusivement au projet Supabase de test `boutique-dev` et à la branche GitHub `develop`. Aucun changement n'a été appliqué à un environnement de production.

## Migrations Supabase appliquées
| Version | Migration |
|---|---|
| 20261111235919 | `stock_ledger_inventory_foundation` |
| 20261111235945 | `operational_revenue_payment_details` |
| 20261112000049 | `conditionnement_transactions_and_receptions` |
| 20261112000312 | `inventory_bulk_count_and_cancellation` |
| 20261112000332 | `supplier_arrival_conditioning_read_api` |
| 20261112000610 | `fix_supplier_arrival_generated_quantity_insert` |
| 20261112000712 | `include_inactive_skus_with_stock_in_inventory` |
| 20261112000823 | `operational_revenue_read_view` |

Les versions et noms sont enregistrés dans `supabase_migrations.schema_migrations` du projet de test.

## Remise à plat du journal de stock
Avant remise à plat, les tables opérationnelles suivantes ont été copiées dans le schéma privé `private` :

- `dev_backup_20261112_stocks_courants`
- `dev_backup_20261112_mouvements_stock`
- `dev_backup_20261112_flux_stock`
- `dev_backup_20261112_lignes_flux_stock`
- `dev_backup_20261112_evenements_flux_stock`
- `dev_backup_20261112_resolutions_anomalies`
- `dev_backup_20261112_operations_idempotentes`

Les soldes existants ont été conservés. Les anciens scénarios de flux et leur idempotence ont été remis à zéro, puis un mouvement `STOCK_INITIAL` a été créé pour chaque couple détenteur/SKU ayant un solde positif.

## Résultat de contrôle après scénarios de test
- 52 lignes de stock courant.
- 53 mouvements de stock.
- 997 unités physiques.
- 997 unités justifiées par le journal.
- 0 écart entre soldes et journal.
- 1 transfert de test clôturé après réservation, expédition, transit, réception et confirmation.
- 1 arrivage fournisseur de test enregistré avec le conditionnement d'origine.
- 2 sessions d'inventaire de test : une clôturée sans écart et une annulée après test du gel des mouvements.
- 7 déclarations de recettes, 15 lignes de paiement.
- 0 mouvement financier lié à une recette.

Les données de test ajoutées sont identifiées par les commentaires et numéros de bon commençant par `TEST-SAM`.

## Règles techniques introduites
- Journal des mouvements append-only : UPDATE et DELETE refusés.
- Réservation de stock atomique lors de la décision positive du magasinier.
- Expédition impossible sans réservation active correspondante.
- Stock disponible calculé comme physique moins réservé.
- Transit entrant calculé depuis les expéditions et réceptions ; non intégré au physique avant réception.
- Inventaire ouvert : mouvements du détenteur suspendus ; clôture par mouvements correctifs ; annulation possible.
- Conditionnements validés côté serveur ; quantité de base conservée avec la quantité saisie, le multiplicateur et le libellé historique.
- Recettes indépendantes des mouvements de trésorerie ; détail par moyen de paiement.

## Synchronisation des migrations
Le dépôt contient historiquement une partie seulement de l'historique SQL Supabase. Les nouvelles versions ci-dessus sont enregistrées dans l'historique de migrations de `boutique-dev`, mais leurs scripts SQL complets doivent encore être recopiés dans `database/migrations` avant toute reproduction sur un autre projet ou déploiement vers recette/production. Ne pas considérer ce document comme un script de migration exécutable.
