const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app={innerHTML:''};
const context={app,currentUser:{nom:'Samuel',assignments:[{role:'PATRON',siteId:null,site:'GLOBAL'}]},esc:v=>String(v??''),request:async(path)=>path.includes('flux_stock')?[{action_code:'CREATION',acteur_nom:'Georges',details:'Flux créé',cree_le:'2026-09-30T08:00:00Z'},{action_code:'DECISION_MAGASINIER',acteur_nom:'Yakin',details:'Quantité 4',cree_le:'2026-09-30T09:00:00Z'}]:[{action_code:'CONFIRMATION_SOURCE',acteur_nom:'Joel',details:'Cash 5000',cree_le:'2026-09-30T10:00:00Z'}],shell:(content)=>{app.innerHTML=content},console};
context.window=context;vm.createContext(context);
for(const file of ['ui-templates.js','transaction-history.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
(async()=>{await vm.runInContext("stockTransactionHistory('flux-12345678')",context);assert.match(app.innerHTML,/Georges/);assert.match(app.innerHTML,/Yakin/);assert.match(app.innerHTML,/30 sept/);await vm.runInContext("moneyTransactionHistory('money-12345678')",context);assert.match(app.innerHTML,/Joel/);assert.match(app.innerHTML,/Cash 5000/);console.log('Historique transactions: OK')})().catch(error=>{console.error(error);process.exitCode=1});
