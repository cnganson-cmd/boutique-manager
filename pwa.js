// Enregistre uniquement le shell statique. Les données métier restent lues en
// ligne afin de ne jamais présenter un stock ou un montant périmé comme actuel.
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(error=>console.warn('PWA indisponible',error)));
