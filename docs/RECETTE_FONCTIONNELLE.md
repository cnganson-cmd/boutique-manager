# Recette fonctionnelle Dev

## Règles d’exécution

- Utiliser uniquement l’environnement Dev.
- Exécuter les scénarios de mutation dans une transaction terminée par `ROLLBACK`.
- Vérifier le statut final et les événements créés avant l’annulation.

## Scénarios prioritaires

| ID | Scénario | Résultat attendu |
|---|---|---|
| AUTH-01 | Compte actif avec rôle | Accueil correspondant au rôle |
| AUTH-02 | Compte désactivé | Session supprimée et accès suspendu |
| ROLE-01 | Cumul magasinier sur plusieurs sites | Sélecteur de contexte disponible |
| ROLE-02 | Ajouter un rôle/site à un déstockeur | Refus automatique par la base |
| STOCK-01 | Georges demande, Yakin prépare et expédie | Flux `EN_TRANSIT` |
| STOCK-02 | Georges reçoit, Yakin confirme | Flux `CLOTURE` |
| STOCK-03 | Joel retourne des invendus | Création, préparation et expédition autorisées vers la boutique configurée |
| STOCK-04 | Boutique reçoit, Joel confirme | Flux de retour `CLOTURE` |
| STOCK-05 | Quantité reçue différente | Flux dirigé vers l’anomalie sans réécriture de l’historique |
| MONEY-01 | Georges déclare une recette | Recette unique enregistrée, cash et Mobile Money séparés |
| MONEY-02 | Georges demande un retrait, Samuel valide | Retrait `CLOTURE` |
| MONEY-03 | Boutique saisit la remise de Joel, Joel confirme | Remise `CLOTURE` |
| MONEY-04 | Joel conteste, boutique corrige | Nouvelle confirmation demandée à Joel |
| MONEY-05 | Route financière physique → mobile | Refus automatique |
| ADMIN-01 | Cedric crée un utilisateur avec civilité, prénom, nom, e-mail et téléphone, puis attribue une responsabilité et un lieu | Profil complet, affectation active et journalisée |
| ADMIN-02 | Désactivation site/utilisateur | Détenteur et routes concernés désactivés |
| UI-01 | Accueils par rôle | Tous les boutons attendus sont présents |
| UI-02 | Handlers des boutons | Aucun bouton ne référence une fonction absente |
| UI-03 | Catalogue | Recherche, filtres et fiche produit accessibles |
| PATRON-01 | Samuel ouvre « Stocks par détenteur » | Tous les sites physiques et déstockeurs mobiles sont listés |
| PATRON-02 | Samuel sélectionne un détenteur | Produits, références et quantités du détenteur sont affichés |
| PATRON-03 | Samuel ouvre « Flux de stock » | Historique réseau avec source, destination, statut et détail |
| PATRON-04 | Samuel ouvre « Mouvements d’argent » | Retraits, remises et décisions financières sont visibles |
| PATRON-05 | Samuel ouvre « Anomalies de stock » | Les anomalies à traiter ou l’état vide sont affichés clairement |
| DESTOCK-01 | Joel ouvre son accueil mobile | Aucun sélecteur de site et uniquement les fonctions Déstockeur |
| DESTOCK-02 | Joel prépare et expédie un retour | Route nominative vers Boutique 104 et stock mobile débité |
| DESTOCK-03 | Georges reçoit puis Joel confirme | Stock boutique crédité et flux `CLOTURE` |
| DESTOCK-04 | Boutique 104 enregistre une remise de Joel | Joel peut confirmer séparément cash et Mobile Money |
| DESTOCK-05 | Ajouter un rôle ou un site à Joel | Refus automatique par la base |
| DESTOCK-06 | Configurer une route financière boutique → Joel | Refus automatique par la base |
| GERANT-01 | Georges ouvre Boutique 104 | Recette, demande, réception, retour et transfert accessibles |
| GERANT-02 | Georges demande un réapprovisionnement | Les deux stocks sources sont nommés et sélectionnables |
| GERANT-03 | Georges contrôle un arrivage | Quantités reçues enregistrées et stock boutique crédité |
| GERANT-04 | Georges déclare une recette | Cash et Mobile Money séparés, reprise idempotente |
| GERANT-05 | Georges demande un retrait, Samuel valide | Retrait `CLOTURE` après validation Patron |
| GERANT-06 | Georges ouvre l’accueil de Boutique 104 | La recette du jour, les tâches, les réceptions en transit et les flux en cours sont synthétisés avant les actions rapides |
| GERANT-07 | Georges consulte « À traiter aujourd’hui » | Les recettes absentes, réceptions, opérations de caisse et écarts sont étiquetés et ouvrent directement l’action correspondante |
| GERANT-08 | Georges consulte l’activité de la boutique | Les derniers flux, recettes et mouvements de caisse autorisés pour Boutique 104 sont affichés chronologiquement |
| MAG-01 | Yakin change de site | Ses trois stocks sont disponibles dans le sélecteur |
| MAG-02 | Yakin prépare et expédie une demande | Stock source débité et flux `EN_TRANSIT` |
| MAG-03 | Yakin confirme le contrôle de Georges | Flux conforme terminé en `CLOTURE` |
| MAG-04 | Yakin choisit un fournisseur pour un nouvel arrivage | Seules les références actives rattachées à ce fournisseur sont proposées |
| MAG-05 | Yakin valide un arrivage de 9 unités dont 2 abîmées | Un numéro `ARR-AAAA-NNNNNN` est généré et 7 unités entrent en stock |
| MAG-06 | Yakin consulte l'arrivage validé | Le bon fournisseur, le numéro interne, le site, l'auteur et le détail des quantités sont visibles |
| MAG-07 | Yakin réutilise le même identifiant d'opération après une coupure réseau | Aucun doublon n'est créé et le résultat de la première validation est renvoyé |
| MAG-08 | Yakin saisit une seconde fois le même numéro de bon pour le même fournisseur, avec une casse ou des espaces différents | Refus automatique « Ce bon de livraison fournisseur a déjà été enregistré » |
| MAG-09 | Une référence non rattachée au fournisseur est envoyée directement à l'API | Refus automatique par la base, sans arrivage ni mouvement de stock résiduel |
| MAG-10 | L'arrivage est validé | Une entrée `ENTREE_FOURNISSEUR` par référence stockée et un événement `ARRIVAGE_FOURNISSEUR_VALIDE` sont journalisés |
| VENTE-01 | Le Vendeur ouvre son accueil | Recette, demande, réception et catalogue uniquement |
| VENTE-02 | Le Vendeur déclare une recette | Cash et Mobile Money enregistrés séparément |
| VENTE-03 | Le Vendeur tente un retrait | Refus automatique, action réservée au Gérant |
| ADMIN-03 | Cedric ouvre la configuration | Utilisateurs, rôles, sites, routes et journal accessibles |
| ADMIN-04 | Cedric crée puis désactive un utilisateur | Modification appliquée et journalisée |
| ADMIN-05 | Cedric consulte les utilisateurs créés avant l’enrichissement des profils | Le prénom reste affiché et la fiche est signalée « À compléter » |
| ADMIN-06 | Cedric invite un profil complet non lié | Le compte Auth est créé ou retrouvé, lié à la fiche et l’e-mail d’accès est envoyé |
| ADMIN-07 | L’utilisateur ouvre l’invitation | Il choisit son mot de passe puis accède à son espace selon ses responsabilités |
| ADMIN-08 | Cedric désactive un utilisateur ou un lieu | Un aperçu des responsabilités et autorisations concernées précède la confirmation |
| ADMIN-09 | Cedric recherche et exporte utilisateurs, produits ou journal | Les filtres fonctionnent et le CSV est téléchargé |
| ADMIN-10 | Cedric modifie un produit ou ajoute une référence | Le catalogue est mis à jour, le SKU est automatique et l’action est journalisée |
| ADMIN-11 | Cedric ajoute, remplace puis supprime la photo d’une référence | Seuls JPEG, PNG et WebP de 5 Mo maximum sont acceptés ; la photo apparaît dans le catalogue puis disparaît après suppression ; chaque changement est journalisé |
| ADMIN-12 | Cedric crée un fabricant et un fournisseur puis les rattache à un produit | Le fabricant est visible sur la fiche catalogue, les fournisseurs restent réservés à l’administration et l’action est journalisée |
| ADMIN-13 | Cedric ouvre les imports Lana Bio | Les propositions sont en statut « À valider » et aucune n’est créée sans l’action « Vérifier et créer » |
| ADMIN-14 | Cedric importe un CSV produits ou utilisateurs | Les lignes valides sont traitées et le nombre de lignes refusées est annoncé |
| ADMIN-15 | Un Gérant appelle une RPC Admin | Refus « Administration non autorisée » |
| ADMIN-16 | Cedric consulte les routes mobiles | Le nom « Joel · mobile » est affiché |
| ADMIN-17 | Cedric ouvre « À traiter » | Le badge compte les sujets actifs ; la page distingue les sujets du nombre d’éléments concernés et les regroupe par Équipe, Catalogue et Boutiques et flux |
| ADMIN-18 | Cedric clique sur une alerte | La page de correction correspondante s’ouvre ; les alertes de profils et de comptes appliquent directement le bon filtre |
| ADMIN-19 | Cedric consulte la priorité d’une alerte | Une étiquette textuelle et colorée indique « Urgent », « À corriger », « À compléter » ou « À valider » ; les contrôles conformes restent repliés en bas de page |

## Contrôle technique des arrivages fournisseurs

La recette de la base est exécutée dans une transaction dédiée, puis annulée avec `ROLLBACK`. Elle doit vérifier ensemble :

1. la génération du numéro interne SAM et la conservation du numéro du bon fournisseur ;
2. le calcul `quantité entrée = quantité reçue - quantité abîmée` ;
3. la variation exacte de `stocks_courants` ;
4. la création du mouvement `ENTREE_FOURNISSEUR` lié à l'arrivage et à sa ligne ;
5. la création de l'événement `ARRIVAGE_FOURNISSEUR_VALIDE` dans le journal d'administration ;
6. l'idempotence de l'identifiant d'opération client ;
7. le refus d'un doublon de bon fournisseur, sans distinction de casse ni d'espaces périphériques ;
8. le refus d'une référence non rattachée au fournisseur sélectionné ;
9. l'absence de toute donnée de test après le `ROLLBACK`.

Dernière exécution en Dev le 29 septembre 2026 : les 9 contrôles sont conformes. Le cas quantitatif testé a reçu 9 unités, signalé 2 unités abîmées et produit une variation de stock de 7 unités. Aucun arrivage de test n'a été conservé.

## Critères de sortie Dev

- Tous les scénarios prioritaires passent.
- Aucun résidu de données de test.
- Aucun échec de syntaxe JavaScript ou de formatage Git.
- Les avertissements advisors sont documentés et compris.
- Validation métier explicite avant toute publication.
