const fs=require('fs');
const read=file=>fs.readFileSync(file,'utf8');

const dev=read('config.js');
const recipe=read('config-test.js');
const prod=read('config-prod.example.js');
const pwa=read('pwa.js');
const worker=read('service-worker.js');

if(!dev.includes("environment:'DEV'"))throw new Error('Configuration DEV absente');
if(!recipe.includes("environment:'RECETTE'"))throw new Error('Configuration RECETTE absente');
if(!prod.includes("environment:'PROD'"))throw new Error('Socle PROD absent');
if(!prod.includes('__SUPABASE_PROD_URL__')||!prod.includes('__SUPABASE_PROD_PUBLISHABLE_KEY__'))throw new Error('La PROD ne doit contenir aucune cible réelle');
if(!pwa.includes('encodeURIComponent(APP_ENV)'))throw new Error('Le service worker doit recevoir l’environnement');
if(!worker.includes("searchParams.get('env')"))throw new Error('Le cache doit être nommé selon l’environnement');
const app=read('app.js');
if(!app.includes("['DEV','RECETTE','PROD'].includes(APP_ENV)"))throw new Error('La liste blanche des environnements est absente');
if(!app.includes("APP_ENV==='PROD'")||!app.includes('volontairement désactivée'))throw new Error('Le blocage de la PROD est absent');

console.log('Séparation des environnements: OK');
