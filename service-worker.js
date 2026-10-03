const ENVIRONMENT=new URL(self.location.href).searchParams.get('env')||'DEV';
const CACHE=`sam-manager-${ENVIRONMENT.toLowerCase()}-shell-v8`;
// GitHub Pages héberge encore DEV et RECETTE dans le même dépôt, tandis que
// Cloudflare ne publie que les fichiers DEV. Le shell dépend donc du contexte
// afin de ne jamais bloquer l'installation de la PWA sur un fichier absent.
const IS_RECIPE=ENVIRONMENT==='RECETTE';
const ENVIRONMENT_SHELL=IS_RECIPE
  ? ['./test.html','./config-test.js','./manifest-test.webmanifest']
  : ['./index.html','./config.js','./manifest.webmanifest'];
const SHELL=['./',...ENVIRONMENT_SHELL,'./styles.css','./sam-theme.css','./crm-theme.css','./mockup-parity.css','./patron-dashboard.css','./patron-dashboard.js','./manager-dashboard.css','./manager-dashboard.js','./assets/brand/logo.svg','./assets/brand/logo-blanc.svg','./assets/brand/icone-app.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sam-manager-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html'))))});
