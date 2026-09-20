const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app={innerHTML:''};
const stockRows=[
  {detenteur_stock_id:'holder-104',type_detenteur:'SITE',detenteur_nom:'Boutique 104',detenteur_actif:true,reference_produit_id:'ref-1',marque_nom:'SAM',produit_nom:'Parfum test',variante:'Femme',reference_libelle:'100 ml',quantite:7},
  {detenteur_stock_id:'holder-joel',type_detenteur:'DESTOCKEUR',detenteur_nom:'Joel',detenteur_actif:true,reference_produit_id:'ref-2',marque_nom:'SAM',produit_nom:'Brume test',variante:'',reference_libelle:'50 ml',quantite:3}
];
const flow={flux_stock_id:'flow-12345678',type_flux_stock_id:'type-1',detenteur_source_id:'holder-joel',detenteur_destination_id:'holder-104',statut:'EN_TRANSIT',cree_le:'2026-09-20T08:00:00Z'};

const context={
  app,
  currentUser:{nom:'Samuel',email:'samuel@example.test',assignments:[{role:'PATRON',siteId:null,site:'GLOBAL'}]},
  sessionStorage:{getItem:()=>'',setItem:()=>{}},
  esc:value=>String(value??'').replace(/[&<>"']/g,''),
  brandMark:()=>'<b>SAM</b>',
  request:async(path,options={})=>{
    if(path.includes('/rpc/consulter_stocks_reseau')){
      const id=options.body?.p_detenteur_stock_id;
      return id?stockRows.filter(row=>row.detenteur_stock_id===id):stockRows;
    }
    if(path.includes('/references_produit'))return [{reference_produit_id:'ref-2',libelle_reference:'50 ml'}];
    throw new Error(`Appel non simulé: ${path}`);
  },
  authApi:async(table,select,filters='')=>{
    if(table==='flux_stock')return filters.includes('statut=eq.ANOMALIE')?[]:[flow];
    if(table==='types_flux_stock')return [{type_flux_stock_id:'type-1',nom_type_flux:'Retour',code_type_flux:'RETOUR'}];
    if(table==='lignes_flux_stock')return [{ligne_flux_stock_id:'line-1',reference_produit_id:'ref-2',quantite_demandee:3}];
    if(table==='flux_argent')return [{flux_argent_id:'money-1',type_flux:'REMISE',montant_cash:5000,montant_mobile_money:2000,statut:'CLOTURE',motif:'Recette',cree_le:'2026-09-20T08:00:00Z'}];
    return [];
  },
  document:{getElementById:()=>null,querySelector:()=>null},
  console,
  Promise,
  setTimeout,
  crypto:{randomUUID:()=> 'operation-test'},
  alert:()=>{},
  confirm:()=>true
};
context.window=context;
vm.createContext(context);
for(const file of ['ux-shell.js','flow-inboxes.js','patron-oversight.js','patron-anomalies.js','money-ux.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

function includes(...labels){for(const label of labels)assert.ok(app.innerHTML.includes(label),`Élément absent: ${label}`)}

(async()=>{
  vm.runInContext('home()',context);
  includes('Stocks par détenteur','Flux de stock','Anomalies de stock','Mouvements d’argent');

  await vm.runInContext('patronStocks()',context);
  includes('Boutique 104','Joel','SITE PHYSIQUE','ACTIVITÉ MOBILE');

  await vm.runInContext("patronStockDetail('holder-104')",context);
  includes('Parfum test','100 ml','7');

  await vm.runInContext('patronStockFlows()',context);
  includes('Joel · mobile','Boutique 104','En transit');

  await vm.runInContext("patronStockFlowDetail('flow-12345678')",context);
  includes('50 ml','Quantité demandée : 3');

  await vm.runInContext('patronMoney()',context);
  includes('Vue financière','Cash','Mobile Money','FCFA');

  await vm.runInContext('patronAnomalies()',context);
  includes('Aucune anomalie en attente');

  console.log('Recette UI Patron: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
