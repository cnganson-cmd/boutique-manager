const ENVIRONMENT=new URL(self.location.href).searchParams.get('env')||'DEV';
const CACHE=`sam-manager-${ENVIRONMENT.toLowerCase()}-shell-v8`;
// GitHub Pages héberge encore DEV et RECETTE dans le même dépôt, tandis que
// Cloudflare ne publie que les fichiers DEV. Le shell dépend donc du contexte
// afin de ne jamais bloquer l'installation de la PWA sur un fichier absent.
const IS_RECIPE=ENVIRONMENT==='RECETTE';
const CANONICAL_LAYOUT=new URL(self.location.href).searchParams.get('layout')==='canonical';
const ENVIRONMENT_SHELL=CANONICAL_LAYOUT
  ? ['./index.html','./config.js','./manifest.webmanifest']
  : IS_RECIPE
  ? ['./test.html','./config-test.js','./manifest-test.webmanifest']
  : ['./index.html','./config.js','./manifest.webmanifest'];
const FALLBACK_PAGE=CANONICAL_LAYOUT||!IS_RECIPE?'./index.html':'./test.html';
const SHELL=['./',...ENVIRONMENT_SHELL,'./styles.css','./sam-theme.css','./crm-theme.css','./mockup-parity.css','./assets/brand/logo.svg','./assets/brand/logo-blanc.svg','./assets/brand/icone-app.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sam-manager-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(response=>response||caches.match(FALLBACK_PAGE))))});
