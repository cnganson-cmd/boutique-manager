const assert=require('node:assert/strict');
const fs=require('node:fs');

const migration=fs.readFileSync('database/migrations/20260929225351_corriger_portee_mouvements_argent.sql','utf8');
const shell=fs.readFileSync('ux-shell.js','utf8');
const stock=fs.readFileSync('stock-flow-ux.js','utf8');
const money=fs.readFileSync('money-ux.js','utf8');
const recipe=fs.readFileSync('docs/RECETTE_FONCTIONNELLE.md','utf8');

assert.match(migration,/h\.site_id = mouvements_argent\.site_id/);
assert.doesNotMatch(migration,/h\.site_id = h\.site_id/);
assert.match(migration,/to authenticated[\s\S]*private\.money_holder_actor/);

for(const expected of [
  'operationalInbox(\'requests\')',
  'operationalInbox(\'receipts\')',
  'operationalInbox(\'confirmations\')',
  'patronStockFlows()',
  'patronMoney()',
  'destockerMoneyHome()'
]) assert.ok(shell.includes(expected),`Parcours absent : ${expected}`);

assert.match(stock,/creer_flux_stock/);
assert.match(money,/creer_retrait_argent/);
assert.match(money,/repondre_remise_argent/);
assert.match(recipe,/E2E-01/);
assert.match(recipe,/E2E-02/);

console.log('Contrat inter-rôles : OK');
