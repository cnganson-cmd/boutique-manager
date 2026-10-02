const fs=require('fs');

const css=fs.readFileSync('crm-theme.css','utf8');

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

console.log('Dark theme contrast smoke test: OK');
