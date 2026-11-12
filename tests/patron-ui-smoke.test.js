const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app={innerHTML:''};
const uiNodes={};
const stockRows=[
  {detenteur_stock_id:'holder-104',type_detenteur:'SITE',detenteur_nom:'Boutique 104',reference_produit_id:'ref-1',marque_nom:'SAM',produit_nom:'Parfum test',variante:'Femme',reference_libelle:'100 ml',quantite_physique:7,quantite_reservee:0,quantite_disponible:7,quantite_en_transit:0},
  {detenteur_stock_id:'holder-joel',type_detenteur:'DESTOCKEUR',detenteur_nom:'Joel',reference_produit_id:'ref-2',marque_nom:'SAM',produit_nom:'Brume test',variante:'',reference_libelle:'50 ml',quantite_physique:3,quantite_reservee:0,quantite_disponible:3,quantite_en_transit:0}
];
const flow={flux_stock_id:'flow-12345678',type_flux_stock_id:'type-1',detenteur_source_id:'holder-joel',detenteur_destination_id:'holder-104',statut:'EN_TRANSIT',cree_le:'2026-09-20T08:00:00Z'};

const context={
  app,
  currentUser:{nom:'Samuel',email:'samuel@example.test',assignments:[{role:'PATRON',siteId:null,site:'GLOBAL'}]},
  sessionStorage:{getItem:()=>'',setItem:()=>{}},
  esc:value=>String(value??'').replace(/[&<>"']/g,''),
  brandMark:()=>'<b>SAM</b>',
  request:async(path,options={})=>{
    if(path.includes('/rpc/consulter_stocks_operationnels')){
      const id=options.body?.p_detenteur_stock_id;
      return id?stockRows.filter(row=>row.detenteur_stock_id===id):stockRows;
    }
    if(path.includes('/rpc/consulter_inventaires_stock'))return [];
    if(path.includes('/references_produit'))return [{reference_produit_id:'ref-2',libelle_reference:'50 ml'}];
    throw new Error(`Appel non simulé: ${path}`);
  },
  authApi:async(table,select,filters='')=>{
    if(table==='flux_stock')return filters.includes('statut=eq.ANOMALIE')?[]:[flow];
    if(table==='types_flux_stock')return [{type_flux_stock_id:'type-1',nom_type_flux:'Retour',code_type_flux:'RETOUR'}];
    if(table==='lignes_flux_stock')return [{ligne_flux_stock_id:'line-1',reference_produit_id:'ref-2',quantite_demandee:3}];
    return [];
  },
  document:{getElementById:id=>uiNodes[id]||(uiNodes[id]={textContent:'',innerHTML:'',value:''}),querySelector:()=>null,querySelectorAll:()=>[]},
  console,
  Promise,
  setTimeout,
  crypto:{randomUUID:()=> 'operation-test'},
  alert:()=>{},
  confirm:()=>true
};
context.window=context;
vm.createContext(context);
for(const file of ['ui-templates.js','ux-shell.js','flow-inboxes.js','patron-oversight.js','patron-anomalies.js','money-ux.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

function includes(...labels){for(const label of labels)assert.ok(app.innerHTML.includes(label),`Élément absent: ${label}`)}

(async()=>{
  vm.runInContext('home()',context);
  includes('Stock du réseau','Sites actifs','Anomalies ouvertes','Inventaires ouverts','DÉCISIONS À PRENDRE','ACTIVITÉ DU RÉSEAU','Stocks par détenteur','Flux de stock','Anomalies de stock','Inventaire');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(uiNodes['metric-network-stock'].textContent,'10 unités');
  assert.equal(uiNodes['metric-stock-alerts'].textContent,'0');
  assert.match(uiNodes['patron-home-tasks'].innerHTML,/À SURVEILLER/);
  assert.match(uiNodes['patron-home-tasks'].innerHTML,/flux ancien/);
  assert.match(uiNodes['patron-home-activity'].innerHTML,/Joel · mobile → Boutique 104/);

  await vm.runInContext('patronStocks()',context);
  includes('Boutique 104','Joel','SITE PHYSIQUE','ACTIVITÉ MOBILE');

  await vm.runInContext("patronStockDetail('holder-104')",context);
  includes('Parfum test','100 ml','7');

  await vm.runInContext('patronStockFlows()',context);
  includes('Joel · mobile','Boutique 104','En transit');

  await vm.runInContext("patronStockFlowDetail('flow-12345678')",context);
  includes('50 ml','Quantité demandée : 3');

  await vm.runInContext('patronMoney()',context);
  includes('Boutique 104','Joel');
  assert.doesNotMatch(app.innerHTML,/Vue financière|Cash|Mobile Money|Remises|Retraits/);

  await vm.runInContext('patronAnomalies()',context);
  includes('Aucune anomalie en attente');

  console.log('Recette UI Patron: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
