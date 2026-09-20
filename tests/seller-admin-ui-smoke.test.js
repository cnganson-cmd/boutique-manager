const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app={innerHTML:''};
const users=[{user_id:'cedric',nom:'Cedric',actif:true,auth_user_id:'auth-cedric'},{user_id:'joel',nom:'Joel',actif:true,auth_user_id:'auth-joel'}];
const sites=[{site_id:'site-104',nom_site:'Boutique 104',type_site_id:'type-shop',ville:'Yaoundé',adresse:'104',actif:true}];
const holders=[
  {detenteur_stock_id:'holder-104',site_id:'site-104',type_detenteur:'SITE',destockeur_user_id:null,actif:true},
  {detenteur_stock_id:'holder-joel',site_id:null,type_detenteur:'DESTOCKEUR',destockeur_user_id:'joel',actif:true}
];
const context={
  app,REAPPRO_TYPE:'reappro-type',
  currentUser:{user_id:'seller',nom:'Vendeur test',email:'seller@example.test',assignments:[{role:'VENDEUR',siteId:'site-104',site:'Boutique 104'}]},
  sessionStorage:{getItem:()=>'',setItem:()=>{},removeItem:()=>{}},
  esc:value=>String(value??'').replace(/[&<>"']/g,''),brandMark:()=>'<b>SAM</b>',
  authApi:async(table)=>{
    if(table==='utilisateurs')return users;
    if(table==='sites')return sites;
    if(table==='detenteurs_stock')return holders;
    if(table==='roles')return [{role_id:'role-admin',code_role:'ADMINISTRATEUR',nom_role:'Administrateur',actif:true},{role_id:'role-seller',code_role:'VENDEUR',nom_role:'Vendeur',actif:true}];
    if(table==='utilisateurs_roles_sites')return [{utilisateur_role_site_id:'a1',user_id:'cedric',role_id:'role-admin',site_id:null,actif:true}];
    if(table==='types_site')return [{type_site_id:'type-shop',code_type:'BOUTIQUE',nom_type:'Boutique',actif:true}];
    if(table==='types_flux_stock')return [{type_flux_stock_id:'return-type',code_type_flux:'RETOUR',nom_type_flux:'Retour',actif:true}];
    if(table==='routes_flux_stock')return [{route_flux_stock_id:'route-1',type_flux_stock_id:'return-type',detenteur_source_id:'holder-joel',detenteur_destination_id:'holder-104',actif:true}];
    if(table==='routes_financieres')return [{route_financiere_id:'money-route',detenteur_source_id:'holder-joel',detenteur_destination_id:'holder-104',actif:true,cree_le:'2026-09-20T08:00:00Z'}];
    if(table==='journal_administration')return [{journal_administration_id:'j1',acteur_user_id:'cedric',action_code:'ROLE_ATTRIBUE',objet_type:'UTILISATEUR_ROLE_SITE',objet_id:'a1',details:{},cree_le:'2026-09-20T08:00:00Z'}];
    if(['flux_stock','flux_argent','recettes'].includes(table))return [];
    return [];
  },
  request:async path=>{if(path.includes('consulter_libelles_detenteurs_accessibles'))return [];throw new Error(`Appel non simulé: ${path}`)},
  document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},
  console,Promise,setTimeout,crypto:{randomUUID:()=> 'operation-test'},alert:()=>{},confirm:()=>true,
  profile:()=>{},catalog:()=>{},cart:[],products:[],catalogReady:true,pendingRequestOperationId:null
};
context.window=context;
vm.createContext(context);
for(const file of ['admin-routes.js','ux-shell.js','route-aware-requests.js','stock-flow-ux.js','flow-inboxes.js','admin-console.js','money-ux.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

function includes(...labels){for(const label of labels)assert.ok(app.innerHTML.includes(label),`Élément absent: ${label}`)}
function excludes(...labels){for(const label of labels)assert.ok(!app.innerHTML.includes(label),`Élément interdit présent: ${label}`)}
function handlersExist(){for(const match of app.innerHTML.matchAll(/onclick="([A-Za-z_$][\w$]*)/g))assert.equal(vm.runInContext(`typeof ${match[1]}`,context),'function',`Handler absent: ${match[1]}`)}

(async()=>{
  vm.runInContext("activeContextSiteId='site-104';home()",context);
  includes('Déclarer la recette','Demander du stock','Contrôler un arrivage','Trouver un produit');
  excludes('Routes de stock','Utilisateurs','Demander un retrait','Retourner du stock');
  handlersExist();

  context.currentUser={user_id:'cedric',nom:'Cedric',email:'cedric@example.test',assignments:[{role:'ADMINISTRATEUR',siteId:null,site:'GLOBAL'}]};
  vm.runInContext("currentUser=globalThis.currentUser;activeContextSiteId='__global__';home()",context);
  includes('Administration','Utilisateurs','Rôles et accès','Sites','Routes de stock','Routes financières','Journal');
  handlersExist();

  vm.runInContext('adminConsole()',context);
  includes('Configuration','Utilisateurs','Rôles & sites','Routes de stock','Routes financières','Journal d’activité');
  handlersExist();

  await vm.runInContext('adminStockRoutes()',context);
  includes('Joel · mobile','Boutique 104','Retour');

  await vm.runInContext('adminFinancialRoutes()',context);
  includes('Joel · mobile','Boutique 104','Routes financières');

  await vm.runInContext('adminJournal()',context);
  includes('Journal d’activité','Rôle attribué','Cedric');

  console.log('Recette UI Vendeur/Administrateur: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
