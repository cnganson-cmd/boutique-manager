# Parfumerie SAM — Boutique Manager

Application interne de gestion des produits, stocks, recettes et remises d’argent de Parfumerie SAM.

Le projet est actuellement utilisé uniquement dans l’environnement **Dev**. Il ne doit pas être publié vers Test/MVP sans validation explicite.

## Documentation

- [Guide utilisateur](docs/GUIDE_UTILISATEUR.md)
- [Dossier d’architecture technique](docs/DAT.md)
- [Recette fonctionnelle](docs/RECETTE_FONCTIONNELLE.md)

## Contrôles rapides

```bash
for file in *.js; do node --check "$file"; done
git diff --check
```

Les tests de base de données doivent être exécutés dans une transaction terminée par `ROLLBACK`, afin de ne pas polluer les données Dev.
