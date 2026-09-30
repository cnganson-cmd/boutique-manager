// Tableau de bord du Gérant. Ce module ne demande jamais un autre site que le
// contexte actif : les politiques RLS et les RPC restent la source d'autorité.
let managerDashboardPeriod=sessionStorage.getItem('bm_manager_period')||'day';
let managerDashboardData=null;

const managerLegacyOperationalDashboard=operationalDashboard;
const managerLegacyLoadOperationalMetrics=loadOperationalMetrics;

function managerPeriodDays(){return({day:1,week:7,month:30})[managerDashboardPeriod]||1}
function managerPeriodLabel(){return({day:"Aujourd’hui",week:'7 jours',month:'30 jours'})[managerDashboardPeriod]||"Aujourd’hui"}
function managerPeriodStart(){const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-(managerPeriodDays()-1));return date}
function managerDateValue(date){return date.toLocaleDateString('en-CA')}
function managerCurrency(value){return`${Number(value||0).toLocaleString('fr-FR')} FCFA`}
function managerSetPeriod(period){if(!['day','week','month'].includes(period))return;managerDashboardPeriod=period;sessionStorage.setItem('bm_manager_period',period);home()}
function managerPeriodButtons(){return`<div class="manager-periods" role="group" aria-label="Période du tableau de bord">${[['day',"Aujourd’hui"],['week','7 jours'],['month','30 jours']].map(([id,label])=>`<button class="${managerDashboardPeriod===id?'active':''}" aria-pressed="${managerDashboardPeriod===id}" onclick="managerSetPeriod('${id}')">${label}</button>`).join('')}</div>`}
function managerKpi(id,label,icon,action,tone=''){return`<button class="manager-command-kpi ${tone}" onclick="${action}"><span>${esc(label)}</span><i aria-hidden="true">${icon}</i><strong id="${id}">—</strong><small>Ouvrir le détail →</small></button>`}

function managerDashboardMarkup(contextId){return`<section class="role-dashboard manager-command" data-home-context="${esc(contextId)}">
  <div class="manager-dashboard-toolbar"><div><small>PÉRIODE ANALYSÉE</small><strong>${managerPeriodLabel()}</strong></div>${managerPeriodButtons()}</div>
  <div class="manager-command-kpis">
    ${managerKpi('manager-kpi-out','Ruptures','×',"managerDashboardDetail('stock')",'danger')}
    ${managerKpi('manager-kpi-low','Stocks faibles','!',"managerDashboardDetail('stock')",'warning')}
    ${managerKpi('manager-kpi-receipts','Réceptions à contrôler','↓',"operationalInbox('receipts')",'flow')}
    ${managerKpi('manager-kpi-requests','Demandes en cours','↗',"managerDashboardDetail('flows')")}
  </div>
  <p class="dashboard-note" id="metric-status" aria-live="polite">Calcul des priorités de la boutique…</p>
  <div class="manager-command-primary">
    <section class="manager-dashboard-panel"><div class="manager-panel-head"><div><small>PRODUITS EN PRIORITÉ</small><h2>Stock à surveiller</h2></div><button onclick="managerDashboardDetail('stock')">Voir tout le stock</button></div><div id="manager-watch-stock" class="manager-dashboard-list"><div class="empty">Chargement…</div></div></section>
    <section class="manager-dashboard-panel"><div class="manager-panel-head"><div><small>À FAIRE MAINTENANT</small><h2>Mes prochaines actions</h2></div><button onclick="taskHub()">Tout afficher</button></div><div id="manager-priority-tasks" class="manager-dashboard-list"><div class="empty">Chargement…</div></div></section>
  </div>
  <div class="manager-command-secondary">
    <section class="manager-dashboard-panel"><div class="manager-panel-head"><div><small>ACTIVITÉ PRODUITS</small><h2>Produits les plus sortis</h2></div><button onclick="managerDashboardDetail('products')">Détail</button></div><div id="manager-top-products" class="manager-dashboard-list"><div class="empty">Chargement…</div></div></section>
    <section class="manager-dashboard-panel"><div class="manager-panel-head"><div><small>MOUVEMENTS</small><h2>Flux de stock en cours</h2></div><button onclick="flowHub()">Voir les flux</button></div><div id="manager-open-flows" class="manager-dashboard-list"><div class="empty">Chargement…</div></div></section>
  </div>
  <section class="manager-dashboard-panel manager-finance"><div class="manager-panel-head"><div><small>CAISSE DE LA BOUTIQUE</small><h2>Situation financière</h2></div><button onclick="moneyHistory()">Voir les mouvements</button></div><p class="manager-finance-note">Les remises reçues augmentent l’argent détenu, pas la recette commerciale.</p><div class="manager-finance-grid">
    <button onclick="managerDashboardDetail('revenue')"><span>Recette de ma boutique</span><strong id="manager-finance-revenue">—</strong><small id="manager-finance-revenue-detail">Cash et Mobile Money</small></button>
    <button onclick="managerDashboardDetail('received')"><span>Argent reçu d’autres détenteurs</span><strong id="manager-finance-received">—</strong><small>Remises entrantes sur la période</small></button>
    <button onclick="managerDashboardDetail('forward')"><span>Argent à remettre</span><strong id="manager-finance-forward">—</strong><small>Solde calculé après remises sortantes clôturées</small></button>
  </div></section>
</section>`}

operationalDashboard=function(roles,contextId){return roles.includes('GERANT')?managerDashboardMarkup(contextId):managerLegacyOperationalDashboard(roles,contextId)};
loadOperationalMetrics=async function(roles,contextId){if(roles.includes('GERANT'))return loadManagerDashboard(contextId);return managerLegacyLoadOperationalMetrics(roles,contextId)};

async function loadManagerDashboard(contextId){
  if(currentContext().id!==contextId)return;
  try{
    const holder=await contextHolder(),site=currentSiteContext();if(!holder||!site)throw new Error('Boutique active introuvable');
    if(!catalogReady)await loadCatalog();
    const start=managerPeriodStart(),startDate=managerDateValue(start),startIso=start.toISOString();
    const [stock,movements,flows,money,revenues]=await Promise.all([
      request('/rest/v1/rpc/consulter_repartition_stock',{method:'POST',auth:true,body:{p_recherche:null}}),
      request('/rest/v1/rpc/consulter_mouvements_stock_accessibles',{method:'POST',auth:true,body:{p_detenteur_stock_id:holder.detenteur_stock_id,p_limite:500}}),
      authApi('flux_stock','flux_stock_id,type_flux_stock_id,detenteur_source_id,detenteur_destination_id,statut,cree_le','&order=cree_le.desc&limit=200'),
      authApi('flux_argent','flux_argent_id,type_flux,detenteur_source_id,detenteur_destination_id,montant_cash,montant_mobile_money,statut,cree_le','&order=cree_le.desc&limit=200'),
      authApi('recettes','recette_id,site_id,date_recette,montant_cash,montant_mobile_money,cree_le',`&site_id=eq.${encodeURIComponent(site.id)}&date_recette=gte.${startDate}&order=date_recette.desc`)
    ]);
    if(currentContext().id!==contextId)return;
    managerDashboardData=buildManagerDashboardData({holderId:holder.detenteur_stock_id,stock,movements,flows,money,revenues,startIso});
    renderManagerDashboard(managerDashboardData);setAttentionCount(managerDashboardData.actionCount);
    const status=document.getElementById('metric-status');if(status)status.textContent=`Données calculées pour ${managerPeriodLabel().toLowerCase()} · stock à l’instant présent`;
  }catch(error){const status=document.getElementById('metric-status');if(status)status.textContent=`Indicateurs indisponibles : ${error.message}`}
}

function buildManagerDashboardData(raw){
  const ownStock=raw.stock.filter(row=>row.detenteur_stock_id===raw.holderId&&row.reference_produit_id),periodMovements=raw.movements.filter(row=>new Date(row.cree_le)>=new Date(raw.startIso));
  const refInfo={};for(const product of products)for(const ref of product.refs)refInfo[ref.id]={product,ref};
  const stockRows=ownStock.map(row=>{const info=refInfo[row.reference_produit_id];return{referenceId:row.reference_produit_id,productId:info?.product.id||'',name:info?`${info.product.brand} ${info.product.name}`:(row.reference_libelle||row.sku_interne||'Référence'),sku:info?.ref.sku||row.sku_interne||'',photo:info?.ref.photo||info?.product.photo||row.photo_url||'',quantity:Number(row.quantite||0)}}).sort((a,b)=>a.quantity-b.quantity);
  const productMap={};for(const movement of periodMovements.filter(row=>Number(row.variation_quantite)<0)){const info=refInfo[movement.reference_produit_id],key=info?.product.id||movement.reference_produit_id,entry=productMap[key]??={productId:info?.product.id||'',referenceId:movement.reference_produit_id,name:info?`${info.product.brand} ${info.product.name}`:(movement.reference_libelle||movement.sku_interne||'Référence'),sku:info?.ref.sku||movement.sku_interne||'',photo:info?.ref.photo||info?.product.photo||'',out:0,current:0};entry.out+=Math.abs(Number(movement.variation_quantite||0))}
  const quantityByRef=Object.fromEntries(stockRows.map(row=>[row.referenceId,row.quantity]));const topProducts=Object.values(productMap).map(item=>({...item,current:quantityByRef[item.referenceId]||0})).sort((a,b)=>b.out-a.out).slice(0,8);
  const relatedFlows=raw.flows.filter(flow=>flow.detenteur_source_id===raw.holderId||flow.detenteur_destination_id===raw.holderId),incoming=relatedFlows.filter(flow=>flow.detenteur_destination_id===raw.holderId&&flow.statut==='EN_TRANSIT'),requests=relatedFlows.filter(flow=>flow.detenteur_source_id===raw.holderId&&['DEMANDE','EN_TRAITEMENT'].includes(flow.statut)),anomalies=relatedFlows.filter(flow=>flow.statut==='ANOMALIE');
  const periodMoney=raw.money.filter(flow=>new Date(flow.cree_le)>=new Date(raw.startIso)),amount=flow=>Number(flow.montant_cash||0)+Number(flow.montant_mobile_money||0),closed=flow=>flow.statut==='CLOTURE';
  const received=periodMoney.filter(flow=>flow.type_flux==='REMISE'&&flow.detenteur_destination_id===raw.holderId&&closed(flow)).reduce((sum,flow)=>sum+amount(flow),0),sent=periodMoney.filter(flow=>flow.type_flux==='REMISE'&&flow.detenteur_source_id===raw.holderId&&closed(flow)).reduce((sum,flow)=>sum+amount(flow),0);
  const revenueCash=raw.revenues.reduce((sum,row)=>sum+Number(row.montant_cash||0),0),revenueMobile=raw.revenues.reduce((sum,row)=>sum+Number(row.montant_mobile_money||0),0),revenueTotal=revenueCash+revenueMobile,forward=Math.max(0,revenueTotal+received-sent);
  const moneyTasks=raw.money.filter(flow=>(flow.detenteur_source_id===raw.holderId&&flow.statut==='A_CONFIRMER_SOURCE')||(flow.detenteur_destination_id===raw.holderId&&flow.statut==='ANOMALIE_CORRIGEABLE'));
  return{...raw,stockRows,topProducts,relatedFlows,incoming,requests,anomalies,moneyTasks,revenueCash,revenueMobile,revenueTotal,received,sent,forward,ruptures:stockRows.filter(row=>row.quantity<=0).length,low:stockRows.filter(row=>row.quantity>0&&row.quantity<=3).length,actionCount:incoming.length+anomalies.length+moneyTasks.length+(raw.revenues.length?0:1)}
}

function managerProductRow(item,mode='stock'){const action=item.productId?`catalogProduct('${item.productId}')`:'catalog()',value=mode==='stock'?(item.quantity<=0?'Rupture':`${item.quantity} unité${item.quantity>1?'s':''}`):`${item.out} sorties`;return`<button class="manager-product-row" onclick="${action}"><span class="manager-product-photo">${item.photo?`<img src="${esc(catalogImageUrl(item.photo,120,55))}" alt="">`:'🧴'}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.sku||'SKU non renseigné')}${mode==='top'?` · stock ${item.current}`:''}</small></div><b class="${mode==='stock'&&item.quantity<=0?'danger':''}">${value}</b><i aria-hidden="true">→</i></button>`}
function managerFlowRow(flow,holderId){const incoming=flow.detenteur_destination_id===holderId,label=incoming?'Réception entrante':'Demande ou sortie';return`<button class="manager-flow-row" onclick="flowHub()"><span>${incoming?'↓':'↗'}</span><div><strong>${label}</strong><small>${esc(flowHumanStatus(flow.statut))} · ${new Date(flow.cree_le).toLocaleDateString('fr-FR')}</small></div><b>${esc(flow.statut)}</b></button>`}

function renderManagerDashboard(data){
  setMetric('manager-kpi-out',data.ruptures);setMetric('manager-kpi-low',data.low);setMetric('manager-kpi-receipts',data.incoming.length);setMetric('manager-kpi-requests',data.requests.length);
  const stock=document.getElementById('manager-watch-stock');if(stock)stock.innerHTML=data.stockRows.filter(row=>row.quantity<=3).slice(0,4).map(row=>managerProductRow(row)).join('')||'<div class="manager-all-clear"><b>✓</b><div><strong>Stock sous contrôle</strong><span>Aucune référence à trois unités ou moins.</span></div></div>';
  const tasks=[];if(!data.revenues.length)tasks.push(managerHomeTask('À DÉCLARER','warning','Recette de la boutique','Aucune recette enregistrée sur la période du jour.','moneyRevenue()','Déclarer'));if(data.incoming.length)tasks.push(managerHomeTask('À CONTRÔLER','review',`${data.incoming.length} réception${data.incoming.length>1?'s':''} en attente`,'Comptez les produits reçus avant validation.',"operationalInbox('receipts')",'Contrôler'));if(data.moneyTasks.length)tasks.push(managerHomeTask('À CONFIRMER','notice',`${data.moneyTasks.length} opération${data.moneyTasks.length>1?'s':''} de caisse`,'Une remise attend votre confirmation ou correction.','moneyTasks()','Examiner'));if(data.anomalies.length)tasks.push(managerHomeTask('URGENT','urgent',`${data.anomalies.length} anomalie${data.anomalies.length>1?'s':''} de stock`,'Un écart a été détecté sur un mouvement.','flowHub()','Examiner'));const taskNode=document.getElementById('manager-priority-tasks');if(taskNode)taskNode.innerHTML=tasks.join('')||'<div class="manager-all-clear"><b>✓</b><div><strong>Tout est à jour</strong><span>Aucune action immédiate pour la boutique.</span></div></div>';
  const top=document.getElementById('manager-top-products');if(top)top.innerHTML=data.topProducts.slice(0,4).map(item=>managerProductRow(item,'top')).join('')||'<div class="empty">Aucune sortie enregistrée sur cette période.</div>';
  const flows=document.getElementById('manager-open-flows');if(flows)flows.innerHTML=data.relatedFlows.filter(flow=>!['CLOTURE','REFUSE'].includes(flow.statut)).slice(0,4).map(flow=>managerFlowRow(flow,data.holderId)).join('')||'<div class="manager-all-clear"><b>✓</b><div><strong>Aucun flux ouvert</strong><span>Tous les mouvements sont clôturés.</span></div></div>';
  setMetric('manager-finance-revenue',managerCurrency(data.revenueTotal));setMetric('manager-finance-received',managerCurrency(data.received));setMetric('manager-finance-forward',managerCurrency(data.forward));const detail=document.getElementById('manager-finance-revenue-detail');if(detail)detail.textContent=`Cash ${managerCurrency(data.revenueCash)} · Mobile ${managerCurrency(data.revenueMobile)}`
}

function managerDashboardDetail(kind){
  const data=managerDashboardData;if(!data)return home();const head=(title,description)=>`<main class="manager-detail"><div class="page-head"><div><span class="eyebrow">GÉRANT · ${managerPeriodLabel().toUpperCase()}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${managerPeriodButtons()}</div>`;let content='';
  if(kind==='stock')content=head('Stock à surveiller','Références en rupture ou à trois unités et moins dans la boutique active.')+`<section class="manager-dashboard-panel"><div class="manager-dashboard-list">${data.stockRows.filter(row=>row.quantity<=3).map(row=>managerProductRow(row)).join('')||'<div class="empty">Aucun stock faible.</div>'}</div></section><button class="primary secondary" onclick="catalog()">Ouvrir tous les produits</button></main>`;
  if(kind==='products')content=head('Produits les plus sortis','Sorties physiques enregistrées sur la période ; elles ne représentent pas nécessairement des ventes.')+`<section class="manager-dashboard-panel"><div class="manager-dashboard-list">${data.topProducts.map(item=>managerProductRow(item,'top')).join('')||'<div class="empty">Aucune sortie sur cette période.</div>'}</div></section></main>`;
  if(kind==='flows')content=head('Flux de stock en cours','Demandes et réceptions encore ouvertes pour cette boutique.')+`<section class="manager-dashboard-panel"><div class="manager-dashboard-list">${data.relatedFlows.filter(flow=>!['CLOTURE','REFUSE'].includes(flow.statut)).map(flow=>managerFlowRow(flow,data.holderId)).join('')||'<div class="empty">Aucun flux ouvert.</div>'}</div></section></main>`;
  if(['revenue','received','forward'].includes(kind)){const titles={revenue:'Recette de ma boutique',received:'Argent reçu d’autres détenteurs',forward:'Argent à remettre'},descriptions={revenue:'Montants commerciaux déclarés, séparés entre cash et Mobile Money.',received:'Remises entrantes clôturées reçues par la boutique.',forward:'Recette et remises reçues, moins les remises sortantes clôturées.'};content=head(titles[kind],descriptions[kind])+`<div class="manager-finance-explain"><strong>Lecture du calcul</strong><span>Recette ${managerCurrency(data.revenueTotal)} + reçu ${managerCurrency(data.received)} − remis ${managerCurrency(data.sent)} = ${managerCurrency(data.forward)} détenus à remettre.</span></div><button class="primary" onclick="moneyHistory()">Ouvrir l’historique financier</button></main>`}
  shell(content||head('Détail indisponible','Aucune donnée à afficher.')+'</main>','home()')
}
