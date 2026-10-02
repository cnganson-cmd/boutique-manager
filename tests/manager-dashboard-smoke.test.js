const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const dashboard=fs.readFileSync('manager-dashboard.js','utf8');
const styles=fs.readFileSync('manager-dashboard.css','utf8');
const testIndex=fs.readFileSync('test.html','utf8');
const devIndex=fs.readFileSync('index.html','utf8');

assert.match(testIndex,/manager-dashboard\.css\?v=2/);
assert.match(testIndex,/manager-dashboard\.js\?v=2/);
assert.doesNotMatch(devIndex,/manager-dashboard/);
assert.match(dashboard,/bm_manager_period/);
for(const label of ["Aujourd’hui",'7 jours','30 jours','Unités disponibles','Stock de','Produits les plus sortis','Flux de stock en cours','Derniers événements','Recette de ma boutique','Argent reçu d’autres détenteurs','Argent à remettre'])assert.ok(dashboard.includes(label),`Élément absent: ${label}`);
assert.match(dashboard,/detenteur_stock_id===raw\.holderId/);
assert.match(dashboard,/site_id=eq\.\$\{encodeURIComponent\(site\.id\)\}/);
assert.match(dashboard,/revenueTotal\+received-sent/);
assert.match(dashboard,/Les remises reçues augmentent l’argent détenu, pas la recette commerciale/);
assert.match(styles,/@media\(max-width:760px\)/);
assert.match(styles,/@media\(max-width:430px\)/);

// Vérifie les calculs métier sans dépendre du réseau : le stock reste limité au
// détenteur actif et une remise reçue n'est jamais confondue avec une recette.
const nodes={};
const context={
  sessionStorage:{getItem:()=>'',setItem:()=>{}},operationalDashboard:()=>'',loadOperationalMetrics:async()=>{},
  products:[{id:'prod-1',brand:'Lana Bio',name:'Lait corps',photo:'',refs:[{id:'ref-1',sku:'SAM-001',photo:''}]}],
  document:{getElementById:id=>nodes[id]||(nodes[id]={textContent:'',innerHTML:''})},
  setMetric:(id,value)=>{(nodes[id]||(nodes[id]={})).textContent=String(value)},setAttentionCount:value=>{context.attention=value},
  managerHomeTask:(label,tone,title)=>`<article>${label} ${tone} ${title}</article>`,
  catalogImageUrl:value=>value,flowHumanStatus:value=>value,moneyStatus:value=>value,esc:value=>String(value??''),
  currentContext:()=>({id:'site-104'}),currentSiteContext:()=>({id:'site-104'}),contextHolder:async()=>({detenteur_stock_id:'holder-104'}),
  catalogReady:true,loadCatalog:async()=>{},request:async()=>[],authApi:async()=>[],home:()=>{},shell:()=>{},taskHub:()=>{},moneyHistory:()=>{},catalog:()=>{},catalogProduct:()=>{},flowHub:()=>{},
  console,Date
};
context.window=context;vm.createContext(context);vm.runInContext(dashboard,context,{filename:'manager-dashboard.js'});
const now=new Date().toISOString(),data=vm.runInContext(`buildManagerDashboardData(${JSON.stringify({
  holderId:'holder-104',startIso:new Date(Date.now()-86400000).toISOString(),todayDate:new Date().toLocaleDateString('en-CA'),
  stock:[{detenteur_stock_id:'holder-104',reference_produit_id:'ref-1',quantite:2},{detenteur_stock_id:'other',reference_produit_id:'ref-1',quantite:99}],
  movements:[{reference_produit_id:'ref-1',variation_quantite:-4,cree_le:now}],
  flows:[{flux_stock_id:'flow-1',detenteur_source_id:'other',detenteur_destination_id:'holder-104',statut:'EN_TRANSIT',cree_le:now}],
  flowLines:[{ligne_flux_stock_id:'line-1',flux_stock_id:'flow-1',reference_produit_id:'ref-1',quantite_demandee:5}],
  lineEvents:[{ligne_flux_stock_id:'line-1',type_evenement:'DECISION_MAGASINIER',quantite:4,cree_le:now}],
  money:[{type_flux:'REMISE',detenteur_source_id:'mobile',detenteur_destination_id:'holder-104',montant_cash:5000,montant_mobile_money:0,statut:'CLOTURE',cree_le:now},{type_flux:'REMISE',detenteur_source_id:'holder-104',detenteur_destination_id:'parent',montant_cash:3000,montant_mobile_money:0,statut:'CLOTURE',cree_le:now}],
  revenues:[{date_recette:'2026-01-01',cree_le:now,montant_cash:10000,montant_mobile_money:2000}]
})})`,context);
assert.equal(data.stockRows.length,1);
assert.equal(data.low,1);
assert.equal(data.totalUnits,2);
assert.equal(data.stockRows[0].inTransit,4);
assert.equal(data.topProducts[0].out,4);
assert.equal(data.revenueTotal,12000);
assert.equal(data.received,5000);
assert.equal(data.sent,3000);
assert.equal(data.forward,14000);
assert.equal(data.todayRevenueRecorded,false);
assert.ok(data.recentActivities.length>=4);
context.testData=data;vm.runInContext('renderManagerDashboard(globalThis.testData)',context);
assert.equal(nodes['manager-finance-revenue'].textContent,'12 000 FCFA');
assert.equal(nodes['manager-finance-received'].textContent,'5 000 FCFA');
assert.equal(nodes['manager-finance-forward'].textContent,'14 000 FCFA');

console.log('Dashboard Gérant interactif: OK');
