# Parfumerie SAM — Boutique Manager

Application interne de gestion des produits, stocks, recettes et remises d’argent de Parfumerie SAM.

Le projet distingue **DEV** pour les travaux en cours, **RECETTE** pour les
tests utilisateurs et un socle **PROD** volontairement désactivé. La recette
n'est pas la production/MVP et aucune ressource PROD n'est encore créée.

## Documentation

- [Guide utilisateur](docs/GUIDE_UTILISATEUR.md)
- [Dossier d’architecture technique](docs/DAT.md)
- [Recette fonctionnelle](docs/RECETTE_FONCTIONNELLE.md)
- [Partager et installer la recette](docs/PARTAGE_RECETTE.md)
- [Environnements et promotions](docs/ENVIRONNEMENTS.md)

## Contrôles rapides

```bash
for file in *.js; do node --check "$file"; done
git diff --check
```

Les tests de base de données doivent être exécutés dans une transaction terminée par `ROLLBACK`, afin de ne pas polluer les données Dev.
