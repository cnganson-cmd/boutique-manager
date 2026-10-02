// Modèle uniquement : ce fichier ne doit pas être chargé ni déployé tel quel.
// La PROD restera bloquée tant que ses valeurs n'auront pas été injectées par
// le processus de déploiement après validation formelle de la RECETTE.
window.BM_CONFIG={
  environment:'PROD',
  supabaseUrl:'__SUPABASE_PROD_URL__',
  supabaseKey:'__SUPABASE_PROD_PUBLISHABLE_KEY__'
};
