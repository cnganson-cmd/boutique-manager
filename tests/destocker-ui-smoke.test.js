const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app={innerHTML:''};
const holderJoel='holder-joel',holder104='holder-104';
const flow={flux_stock_id:'flow-12345678',type_flux_stock_id:'type-return',detenteur_source_id:holderJoel,detenteur_destination_id:holder104,demandeur_user_id:'joel',statut:'DEMANDE',cree_le:'2026-09-20T08:00:00Z'};
const context={
  app,
  currentUser:{user_id:'joel',nom:'Joel',email:'joel@example.test',assignments:[{role:'DESTOCKEUR',siteId:null,site:'GLOBAL'}]},
  sessionStorage:{getItem:()=>'',setItem:()=>{},removeItem:()=>{}},
  esc:value=>String(value??'').replace(/[&<>"']/g,''),
  brandMark:()=>'<b>SAM</b>',
  authApi:async(table,select,filters='')=>{
    if(table==='detenteurs_stock')return [{detenteur_stock_id:holderJoel,type_detenteur:'DESTOCKEUR',site_id:null,destockeur_user_id:'joel',actif:true}];
    if(table==='types_flux_stock')return [{type_flux_stock_id:'type-return',code_type_flux:'RETOUR',nom_type_flux:'Retour',actif:true}];
    if(table==='routes_flux_stock')return [{route_flux_stock_id:'route-1',type_flux_stock_id:'type-return',detenteur_source_id:holderJoel,detenteur_destination_id:holder104,actif:true}];
    if(table==='flux_stock')return [flow];
    if(table==='flux_argent')return [{flux_argent_id:'money-1',type_flux:'REMISE',detenteur_source_id:holderJoel,detenteur_destination_id:holder104,montant_cash:1000,montant_mobile_money:500,statut:'A_CONFIRMER_SOURCE',cree_le:'2026-09-20T08:00:00Z'}];
    return [];
  },
  request:async path=>{
    if(path.includes('consulter_libelles_detenteurs_accessibles'))return [
      {detenteur_stock_id:holderJoel,type_detenteur:'DESTOCKEUR',detenteur_nom:'Joel'},
      {detenteur_stock_id:holder104,type_detenteur:'SITE',detenteur_nom:'Boutique 104'}
    ];
    throw new Error(`Appel non simulé: ${path}`);
  },
  document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},
  console,Promise,setTimeout,
  crypto:{randomUUID:()=> 'operation-test'},
  alert:()=>{},confirm:()=>true,
  cart:[],products:[],catalogReady:true,pendingRequestOperationId:null
};
context.window=context;
vm.createContext(context);
for(const file of ['ux-shell.js','stock-flow-ux.js','flow-inboxes.js','money-ux.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

function includes(...labels){for(const label of labels)assert.ok(app.innerHTML.includes(label),`Élément absent: ${label}`)}

(async()=>{
  vm.runInContext('home()',context);
  includes('Activité mobile','Retourner des invendus','Retours à envoyer','Recevoir du stock','Ma caisse mobile');

  const routes=await vm.runInContext("loadContextFlowRoutes('RETOUR','out')",context);
  assert.equal(routes.length,1);
  assert.equal(routes[0].sourceName,'Joel');
  assert.equal(routes[0].destinationName,'Boutique 104');

  await vm.runInContext("operationalInbox('outgoing')",context);
  includes('Retours à envoyer','Joel','Boutique 104','Nouvelle demande');

  await vm.runInContext('destockerMoneyHome()',context);
  includes('Mes remises','À confirmer','Historique');

  await vm.runInContext('moneyTasks()',context);
  includes('À traiter','1 opération','Cash','Mobile Money');

  console.log('Recette UI Déstockeur: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
