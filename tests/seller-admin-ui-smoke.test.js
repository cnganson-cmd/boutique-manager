const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app={innerHTML:''};
const users=[{user_id:'cedric',nom:'Cedric',prenom:'Cedric',nom_famille:'Ngono',civilite:'M',email:'cedric@example.test',telephone:'+237600000001',actif:true,auth_user_id:'auth-cedric'},{user_id:'joel',nom:'Joel',prenom:'Joel',nom_famille:null,civilite:null,email:null,telephone:null,actif:true,auth_user_id:'auth-joel'}];
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
    if(table==='produits')return [{produit_id:'product-1',nom_produit:'Lait corps',variante:'Karité',marque_id:'brand-1',categorie_produit_id:'category-1',type_produit_id:'type-1',fabricant_id:'manufacturer-1',actif:true}];
    if(table==='marques')return [{marque_id:'brand-1',nom_marque:'SAM Test',actif:true}];
    if(table==='categories_produits')return [{categorie_produit_id:'category-1',nom_categorie:'Corps',actif:true}];
    if(table==='types_produit')return [{type_produit_id:'type-1',nom_type:'Lait',actif:true}];
    if(table==='fabricants')return [{fabricant_id:'manufacturer-1',nom_fabricant:'Lana Bio Cosmetics',actif:true}];
    if(table==='fournisseurs')return [{fournisseur_id:'supplier-1',nom_fournisseur:'Lana Bio Cosmetics',actif:true}];
    if(table==='produits_fournisseurs')return [{produit_id:'product-1',fournisseur_id:'supplier-1',actif:true}];
    if(table==='candidats_import_catalogue')return [{candidat_import_id:'candidate-1',source_code:'LANA_SITE',source_url:'https://example.test/lana',source_photo_url:'https://example.test/lana.png',marque:'Caro Care',nom_produit:'Crème clarifiante',variante:null,categorie_suggeree:'Corps',type_suggere:'Lait',contenance_valeur:300,unite_contenance:'G',fabricant:'Lana Bio Cosmetics',fournisseur:'Lana Bio Cosmetics',statut:'A_VALIDER',produit_id:null}];
    if(table==='references_produit')return [{reference_produit_id:'ref-1',produit_id:'product-1',sku_interne:'SAM-000001',libelle_reference:'Lait corps · Karité · 400 ML',photo_url:'https://example.test/lait.webp',actif:true}];
    if(table==='conditionnements_reference')return [];
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
for(const file of ['admin-routes.js','ux-shell.js','route-aware-requests.js','stock-flow-ux.js','flow-inboxes.js','catalog-admin.js','admin-console.js','admin-extras.js','money-ux.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

function includes(...labels){for(const label of labels)assert.ok(app.innerHTML.includes(label),`Élément absent: ${label}`)}
function excludes(...labels){for(const label of labels)assert.ok(!app.innerHTML.includes(label),`Élément interdit présent: ${label}`)}
function handlersExist(){for(const match of app.innerHTML.matchAll(/onclick="([A-Za-z_$][\w$]*)/g))assert.equal(vm.runInContext(`typeof ${match[1]}`,context),'function',`Handler absent: ${match[1]}`)}

(async()=>{
  vm.runInContext("activeContextSiteId='site-104';home()",context);
  includes('Déclarer la recette','Demander du stock','Contrôler un arrivage','Trouver un produit','À traiter','Plus');
  excludes('Routes de stock','Utilisateurs','Demander un retrait','Retourner du stock');
  handlersExist();

  context.currentUser={user_id:'cedric',nom:'Cedric',email:'cedric@example.test',assignments:[{role:'ADMINISTRATEUR',siteId:null,site:'GLOBAL'}]};
  vm.runInContext("currentUser=globalThis.currentUser;activeContextSiteId='__global__';home()",context);
  includes('Administration','Produits','Équipe','Boutiques et circulation','Contrôle','À traiter','Navigation principale de l’administration');
  excludes('Routes de stock','Routes financières','Rôles et accès','Plus');
  handlersExist();

  await vm.runInContext('adminCrmHome()',context);
  includes('Fournisseurs','Lana Bio Cosmetics','produits · 1 références','Dernier arrivage','FICHE FOURNISSEUR','Arrivages','Historique','Colonnes');
  handlersExist();

  await vm.runInContext('adminAttentionHub()',context);
  includes('2 actions à traiter','Fiches utilisateur à compléter','Produits importés à valider');
  handlersExist();

  vm.runInContext('userGuide()',context);
  includes('GUIDE UTILISATEUR','Recherche globale','Espace actif','Badge à traiter','Fournisseurs et catalogue','Besoin d’aide');
  handlersExist();

  vm.runInContext('adminConsole()',context);
  includes('Gérer l’entreprise','Produits','Équipe','Boutiques et circulation','Contrôle');
  handlersExist();

  vm.runInContext('adminTeamHub()',context);
  includes('Gérer l’équipe','Utilisateurs','Responsabilités et lieux de travail');
  handlersExist();

  await vm.runInContext('adminUsers()',context);
  includes('Cedric','Joel','FICHE COMPLÈTE','FICHE À COMPLÉTER','Rechercher','Exporter','Importer','Accès');
  handlersExist();

  vm.runInContext('adminNewUser()',context);
  includes('Civilité','Prénom','Nom','Adresse e-mail','Numéro de téléphone');
  handlersExist();

  await vm.runInContext("adminUserAccess('cedric')",context);
  includes('Accès de Cedric','Renvoyer un accès','Réinitialiser le mot de passe','Synchroniser l’e-mail');
  handlersExist();

  await vm.runInContext('adminCatalog()',context);
  includes('Lait corps','Modifier','Référentiels','Imports à valider','Lana Bio Cosmetics','Importer CSV','Exporter');
  handlersExist();

  await vm.runInContext("adminEditProduct('product-1')",context);
  includes('Modifier la référence','class="row-action"','Fabricant','Fournisseur(s)','Lana Bio Cosmetics');
  handlersExist();

  await vm.runInContext('adminCatalogSettings()',context);
  vm.runInContext("adminPartnerForm('FOURNISSEUR','supplier-1')",context);
  includes('Voir les produits rattachés','seuls proposés au Magasinier');
  await vm.runInContext("adminSupplierProducts('supplier-1')",context);
  includes('1 produit(s) rattaché(s)','Lait corps','Gérer les rattachements dans les produits');
  handlersExist();

  await vm.runInContext('adminLanaImports()',context);
  includes('Produits à valider','Crème clarifiante','Vérifier et créer','Aucun produit n’est ajouté automatiquement');
  handlersExist();

  await vm.runInContext("adminEditReference('ref-1','product-1')",context);
  includes('Photo de la référence','Remplacer la photo','Supprimer la photo','image/jpeg,image/png,image/webp');
  handlersExist();

  vm.runInContext('adminNetworkHub()',context);
  includes('Points de vente et stocks','Mouvements de stock autorisés','Remises d’argent autorisées');
  handlersExist();

  await vm.runInContext('adminStockRoutes()',context);
  includes('Mouvements de stock autorisés','Joel · mobile','Boutique 104','Retour');

  await vm.runInContext('adminFinancialRoutes()',context);
  includes('Joel · mobile','Boutique 104','Remises d’argent autorisées');

  await vm.runInContext('adminJournal()',context);
  includes('Historique des modifications','Responsabilité attribuée','Cedric','Exporter le journal','Depuis','Voir les détails','class="row-action"');

  console.log('Recette UI Vendeur/Administrateur: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
