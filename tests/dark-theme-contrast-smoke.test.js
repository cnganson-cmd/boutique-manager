const fs=require('fs');

const css=fs.readFileSync('crm-theme.css','utf8');
const testHtml=fs.readFileSync('test.html','utf8');
const indexHtml=fs.readFileSync('index.html','utf8');
const serviceWorker=fs.readFileSync('service-worker.js','utf8');

function expectRule(selector,property){
  const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const rule=new RegExp(`${escaped}[^}]*${property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'s');
  if(!rule.test(css))throw new Error(`Règle de contraste absente : ${selector} → ${property}`);
}

// Les montants utilisent plusieurs balises selon les vues métier.
expectRule('html[data-theme="dark"] .patron-revenue-row > strong','color: var(--sam-ink)');
expectRule('html[data-theme="dark"] .patron-compact-row > b','color: var(--sam-ink)');
expectRule('html[data-theme="dark"] .stock-quantity','color: var(--sam-ink)');
expectRule('html[data-theme="dark"] .summary-card dd','color: var(--sam-ink)');

// Les tableaux et les textes secondaires doivent aussi rester lisibles.
expectRule('html[data-theme="dark"] td','color: var(--sam-ink)');
expectRule('html[data-theme="dark"] p','color: var(--sam-muted)');
expectRule('html[data-theme="dark"] ::placeholder','color: #879991');

// Un numéro de version explicite empêche les navigateurs et la PWA de garder
// une ancienne feuille après la publication d'une correction visuelle.
if(!testHtml.includes('crm-theme.css?v=14'))throw new Error('Version du thème RECETTE non actualisée');
if(!indexHtml.includes('crm-theme.css?v=14'))throw new Error('Version du thème DEV non actualisée');
if(!serviceWorker.includes("sam-manager-shell-v7"))throw new Error('Cache PWA non actualisé');

console.log('Dark theme contrast smoke test: OK');
