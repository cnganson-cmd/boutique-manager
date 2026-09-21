const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app={innerHTML:''},holder104='holder-104',holderDepot='holder-depot',holderWarehouse='holder-warehouse';
let actor='manager';
const routes=[
  {route_flux_stock_id:'route-1',type_flux_stock_id:'reappro-type',detenteur_source_id:holderDepot,detenteur_destination_id:holder104,actif:true},
  {route_flux_stock_id:'route-2',type_flux_stock_id:'reappro-type',detenteur_source_id:holderWarehouse,detenteur_destination_id:holder104,actif:true}
];
const context={
  app,REAPPRO_TYPE:'reappro-type',
  currentUser:{user_id:'georges',nom:'Georges',email:'georges@example.test',assignments:[{role:'GERANT',siteId:'site-104',site:'Boutique 104'}]},
  sessionStorage:{getItem:()=>'',setItem:()=>{},removeItem:()=>{}},
  esc:value=>String(value??'').replace(/[&<>"']/g,''),brandMark:()=>'<b>SAM</b>',
  authApi:async(table,select,filters='')=>{
    if(table==='detenteurs_stock')return [{detenteur_stock_id:actor==='manager'?holder104:holderDepot,type_detenteur:'SITE',site_id:actor==='manager'?'site-104':'site-depot',actif:true}];
    if(table==='routes_flux_stock')return actor==='manager'?routes:[routes[0]];
    if(table==='types_flux_stock')return [{type_flux_stock_id:'reappro-type',code_type_flux:'REAPPROVISIONNEMENT',nom_type_flux:'Réapprovisionnement',actif:true}];
    if(table==='flux_stock')return [{flux_stock_id:'flow-1',type_flux_stock_id:'reappro-type',detenteur_source_id:holderDepot,detenteur_destination_id:holder104,statut:actor==='manager'?'EN_TRANSIT':'DEMANDE',cree_le:'2026-09-20T08:00:00Z'}];
    if(table==='flux_argent'||table==='recettes')return [];
    return [];
  },
  request:async path=>{
    if(path.includes('consulter_repartition_stock'))return [
      {detenteur_stock_id:holderDepot,type_detenteur:'SITE',detenteur_nom:'Dépôt Marché Central',reference_produit_id:'ref-a',sku_interne:'SAM-000101',photo_url:null,marque_nom:'Caro Care',produit_nom:'Crème clarifiante',variante:null,reference_libelle:'Crème 300 G',quantite:18,mis_a_jour_le:'2026-09-20T08:00:00Z'},
      {detenteur_stock_id:holderWarehouse,type_detenteur:'SITE',detenteur_nom:'Entrepôt Marché Kol Bikok',reference_produit_id:'ref-a',sku_interne:'SAM-000101',photo_url:null,marque_nom:'Caro Care',produit_nom:'Crème clarifiante',variante:null,reference_libelle:'Crème 300 G',quantite:7,mis_a_jour_le:'2026-09-20T09:00:00Z'}
    ];
    if(path.includes('consulter_mouvements_stock_accessibles'))return [];
    if(path.includes('consulter_libelles_detenteurs_accessibles'))return [
      {detenteur_stock_id:holder104,detenteur_nom:'Boutique 104'},
      {detenteur_stock_id:holderDepot,detenteur_nom:'Dépôt Marché Central'},
      {detenteur_stock_id:holderWarehouse,detenteur_nom:'Entrepôt Marché Kol Bikok'}
    ];
    throw new Error(`Appel non simulé: ${path}`);
  },
  document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},
  console,Promise,setTimeout,crypto:{randomUUID:()=> 'operation-test'},alert:()=>{},confirm:()=>true,
  profile:()=>{},catalog:()=>{},
  cart:[],products:[],catalogReady:true,pendingRequestOperationId:null
};
context.window=context;
vm.createContext(context);
for(const file of ['ux-shell.js','catalog-ux.js','route-aware-requests.js','stock-flow-ux.js','stock-network-ux.js','flow-inboxes.js','money-ux.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

function includes(...labels){for(const label of labels)assert.ok(app.innerHTML.includes(label),`Élément absent: ${label}`)}
function handlersExist(){for(const match of app.innerHTML.matchAll(/onclick="([A-Za-z_$][\w$]*)/g)){assert.equal(vm.runInContext(`typeof ${match[1]}`,context),'function',`Handler absent: ${match[1]}`)}}

(async()=>{
  vm.runInContext("activeContextSiteId='site-104';home()",context);
  includes('Boutique 104','Recette et caisse','Demander du stock','Contrôler un arrivage','Retourner du stock','Transférer du stock');
  handlersExist();

  const requestRoutes=await vm.runInContext('loadRequestRoutes()',context);
  assert.deepEqual(requestRoutes.map(route=>route.sourceName).sort(),['Dépôt Marché Central','Entrepôt Marché Kol Bikok'].sort());

  await vm.runInContext("operationalInbox('receipts')",context);
  includes('Réceptions','Dépôt Marché Central','Boutique 104','En transit');

  vm.runInContext('moneyHome()',context);
  includes('Recettes & remises','Déclarer ma recette','Remise reçue','Demander un retrait');
  handlersExist();

  actor='storekeeper';
  context.currentUser={user_id:'yakin',nom:'Yakin',email:'yakin@example.test',assignments:[
    {role:'MAGASINIER',siteId:'site-workshop',site:'Atelier Montée Jouvence'},
    {role:'MAGASINIER',siteId:'site-depot',site:'Dépôt Marché Central'},
    {role:'MAGASINIER',siteId:'site-warehouse',site:'Entrepôt Marché Kol Bikok'}
  ]};
  vm.runInContext("currentUser=globalThis.currentUser;activeContextSiteId='site-depot';home()",context);
  includes('Dépôt Marché Central','Stock réseau','Demandes à préparer','Envoyer du stock','Recevoir un retour','Confirmer une réception');
  handlersExist();

  await vm.runInContext('stockNetwork()',context);
  includes('SAM-000101','Crème clarifiante','25 unités','2 emplacements','Dépôt Marché Central');
  handlersExist();

  await vm.runInContext("operationalInbox('requests')",context);
  includes('Demandes reçues','Dépôt Marché Central','Boutique 104','Nouvelle demande');

  console.log('Recette UI Gérant/Magasinier: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
