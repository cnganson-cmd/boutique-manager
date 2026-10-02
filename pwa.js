// Enregistre uniquement le shell statique. Le paramètre d'environnement crée
// un cache distinct sur les futurs domaines DEV, RECETTE et PROD. Les données
// métier restent toujours lues en ligne.
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(`./service-worker.js?env=${encodeURIComponent(APP_ENV)}&v=8`).catch(error=>console.warn('PWA indisponible',error)));
