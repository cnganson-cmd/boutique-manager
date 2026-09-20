# Guide utilisateur — Parfumerie SAM

## Se repérer

L’application affiche seulement les fonctions utiles au rôle et à l’espace sélectionné. Le sélecteur situé en haut permet de changer de boutique, dépôt ou activité mobile lorsque l’utilisateur possède plusieurs accès.

Le menu inférieur contient quatre entrées :

- **Accueil** : actions principales du rôle ;
- **À traiter** : opérations qui attendent une décision ;
- **Produits** : recherche par marque, produit, variante ou format ;
- **Plus** : historique, argent, administration et profil selon les droits.

Sur PC, ce même menu apparaît à gauche de l’écran. Sur tablette et téléphone, il reste en bas afin de rester facilement accessible au toucher.

## Gérant — exemple Georges

1. **Déclarer une recette** : Accueil → Recette et caisse → Déclarer ma recette.
2. **Demander du stock** : choisir la source autorisée, ajouter les produits, vérifier le récapitulatif, puis envoyer.
3. **Réceptionner un arrivage** : À traiter → Réceptions → saisir les quantités réellement reçues.
4. **Recevoir une remise d’argent** : sélectionner la source, saisir séparément le cash et le Mobile Money. La source devra confirmer.
5. **Demander un retrait** : saisir le montant et le motif. Le Patron devra prendre la décision.

Les montants doivent être des nombres entiers positifs en FCFA. Au moins un montant cash ou Mobile Money doit être renseigné.

## Magasinier — exemple Yakin

1. Sélectionner le dépôt ou l’entrepôt concerné.
2. Ouvrir **Demandes à préparer**.
3. Valider, modifier ou refuser chaque quantité.
4. Expédier les lignes préparées.
5. Après le contrôle du destinataire, ouvrir **Confirmer une réception** et confirmer ou contester l’écart.

Les rôles et sites de Yakin peuvent se cumuler. Il doit donc toujours vérifier l’espace affiché en haut de l’écran.

Les demandes indiquent le nom complet de la source et de la destination, par exemple « Dépôt Marché Central → Boutique 104 ».

## Vendeur

Le vendeur dispose d’un parcours volontairement court : recette du jour, demande de stock, contrôle des arrivages et recherche produit. Il ne peut pas configurer les routes ou gérer les utilisateurs.

Il peut déclarer la recette de son site, mais ne peut ni demander un retrait ni enregistrer une remise reçue : ces actions restent sous la responsabilité du Gérant.

## Déstockeur mobile — exemple Joel

Le déstockeur n’est rattaché à aucun site et ne peut cumuler aucun autre rôle.

Les écrans indiquent le trajet complet des opérations, par exemple « Joel → Boutique 104 ».

### Recevoir du stock

À traiter → Stock à réceptionner → ouvrir le transfert → comparer les quantités → confirmer le contrôle.

### Retourner des invendus

1. Accueil → Retourner des invendus.
2. Ajouter les produits et créer le retour.
3. Ouvrir **Retours à envoyer**.
4. Vérifier les quantités et expédier.
5. Après le contrôle de la boutique, ouvrir **Retours à confirmer**.
6. Confirmer si les quantités correspondent, sinon contester avec un commentaire.

### Remettre l’argent

Le point de vente physique autorisé saisit le montant reçu. Joel ouvre ensuite **Ma caisse mobile** pour confirmer ou contester le cash et le Mobile Money. Une remise mobile ne peut jamais avoir un détenteur mobile comme destination.

## Patron — exemple Samuel

Samuel utilise la vue globale pour suivre les stocks de tous les détenteurs, les flux du réseau, les anomalies et les mouvements financiers. « Stocks par détenteur » affiche les sites physiques et les activités mobiles ; un clic ouvre le détail des produits et quantités. Il valide ou refuse les retraits et arbitre les anomalies qui ne peuvent plus être corrigées par les acteurs opérationnels.

## Administrateur — exemple Cedric

Cedric gère les utilisateurs, rôles, sites, routes de stock, routes financières et le journal d’administration. La désactivation d’un utilisateur ou d’un site désactive les détenteurs concernés ; les routes ne sont jamais réactivées automatiquement.

## En cas de problème

- Vérifier l’espace sélectionné en haut de l’écran.
- Lire le message affiché : une action absente est généralement non autorisée pour le rôle courant.
- Utiliser **Réessayer** après une coupure réseau. Les opérations sensibles réutilisent le même identifiant afin d’éviter les doublons.
- Ne jamais partager les identifiants de connexion.
