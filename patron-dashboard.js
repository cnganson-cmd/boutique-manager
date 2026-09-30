// Tableau de pilotage du Patron. Les calculs sont effectués uniquement à partir
// des lignes que les politiques RLS et les RPC autorisent pour la session.
let patronDashboardPeriod=sessionStorage.getItem('bm_patron_period')||'week';
let patronDashboardData=null;

const patronLegacyGlobalDashboard=globalDashboard;
const patronLegacyLoadGlobalMetrics=loadGlobalMetrics;

function patronPeriodDays(){return ({day:1,week:7,month:30})[patronDashboardPeriod]||7}
function patronPeriodLabel(){return ({day:"Aujourd’hui",week:'7 jours',month:'30 jours'})[patronDashboardPeriod]||'7 jours'}
function patronPeriodStart(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(patronPeriodDays()-1));return d}
function patronIsoDate(date){return date.toLocaleDateString('en-CA')}
function patronCurrency(value){return `${Number(value||0).toLocaleString('fr-FR')} FCFA`}
function patronDashboardSetPeriod(period){if(!['day','week','month'].includes(period))return;patronDashboardPeriod=period;sessionStorage.setItem('bm_patron_period',period);home()}
function patronPeriodButtons(){return `<div class="patron-periods" role="group" aria-label="Période du tableau de bord">${[['day',"Aujourd’hui"],['week','7 jours'],['month','30 jours']].map(([id,label])=>`<button class="${patronDashboardPeriod===id?'active':''}" aria-pressed="${patronDashboardPeriod===id}" onclick="patronDashboardSetPeriod('${id}')">${label}</button>`).join('')}</div>`}

function patronDashboardMarkup(contextId){return `<section class="role-dashboard patron-command" data-home-context="${esc(contextId)}">
  <div class="patron-dashboard-toolbar"><div><small>PÉRIODE ANALYSÉE</small><strong>${patronPeriodLabel()}</strong></div>${patronPeriodButtons()}</div>
  <div class="patron-command-kpis">
    ${patronCommandKpi('patron-kpi-revenue','Recettes réseau','₣',"patronDashboardDetail('revenue')",'money')}
    ${patronCommandKpi('patron-kpi-unremitted','Argent non remis','↗',"patronDashboardDetail('unremitted')",'warning')}
    ${patronCommandKpi('patron-kpi-stock','Stock réseau','▦',"patronDashboardDetail('stock')",'stock')}
    ${patronCommandKpi('patron-kpi-alerts','Alertes ouvertes','!',"patronDashboardDetail('alerts')",'danger')}
  </div>
  <p class="dashboard-note" id="metric-status" aria-live="polite">Calcul des indicateurs du réseau…</p>
  <div class="patron-command-primary">
    <section class="patron-dashboard-panel"><div class="patron-panel-head"><div><small>RECETTES PAR POINT DE VENTE</small><h2>Cash et Mobile Money</h2></div><button onclick="patronDashboardDetail('revenue')">Voir le détail</button></div><div id="patron-revenue-chart" class="patron-revenue-chart"><div class="empty">Chargement…</div></div></section>
    <section class="patron-dashboard-panel"><div class="patron-panel-head"><div><small>ALERTES PRIORITAIRES</small><h2>À traiter maintenant</h2></div><button onclick="patronDashboardDetail('alerts')">Tout voir</button></div><div id="patron-priority-alerts" class="patron-alert-list"><div class="empty">Chargement…</div></div></section>
  </div>
  <div class="patron-command-secondary">
    <section class="patron-dashboard-panel"><div class="patron-panel-head"><div><small>TOP PRODUITS</small><h2>Produits les plus sortis</h2></div><button onclick="patronDashboardDetail('products')">Tout voir</button></div><div id="patron-top-products" class="patron-compact-list"><div class="empty">Chargement…</div></div></section>
    <section class="patron-dashboard-panel"><div class="patron-panel-head"><div><small>STOCK DU RÉSEAU</small><h2>Stock par détenteur</h2></div><button onclick="patronStocks()">Tout voir</button></div><div id="patron-stock-holders" class="patron-compact-list"><div class="empty">Chargement…</div></div></section>
    <section class="patron-dashboard-panel"><div class="patron-panel-head"><div><small>TRÉSORERIE TERRAIN</small><h2>Argent non remis</h2></div><button onclick="patronDashboardDetail('unremitted')">Tout voir</button></div><div id="patron-unremitted-list" class="patron-compact-list"><div class="empty">Chargement…</div></div></section>
  </div>
</section>`}

function patronCommandKpi(id,label,icon,action,tone){return `<button class="patron-command-kpi ${tone}" onclick="${action}"><span>${esc(label)}</span><i aria-hidden="true">${icon}</i><strong id="${id}">—</strong><small>Ouvrir le détail →</small></button>`}

globalDashboard=function(roles,contextId){return roles.includes('PATRON')?patronDashboardMarkup(contextId):patronLegacyGlobalDashboard(roles,contextId)};
loadGlobalMetrics=async function(roles,contextId){if(roles.includes('PATRON'))return loadPatronDashboard(contextId);return patronLegacyLoadGlobalMetrics(roles,contextId)};

async function loadPatronDashboard(contextId){
  if(currentContext().id!==contextId)return;
  const start=patronPeriodStart(),startDate=patronIsoDate(start),startIso=start.toISOString();
  try{
    if(!catalogReady)await loadCatalog();
    const [revenues,moneyFlows,stockFlows,networkStock,movements,sites,holders]=await Promise.all([
      authApi('recettes','recette_id,site_id,date_recette,montant_cash,montant_mobile_money,cree_le',`&date_recette=gte.${startDate}&order=date_recette.desc`),
      authApi('flux_argent','flux_argent_id,type_flux,site_source_id,detenteur_source_id,detenteur_destination_id,montant_cash,montant_mobile_money,statut,cree_le',`&order=cree_le.desc&limit=500`),
      authApi('flux_stock','flux_stock_id,detenteur_source_id,detenteur_destination_id,statut,cree_le',`&order=cree_le.desc&limit=500`),
      patronNetworkStock(),
      request('/rest/v1/rpc/consulter_mouvements_stock_accessibles',{method:'POST',auth:true,body:{p_detenteur_stock_id:null,p_limite:500}}),
      authApi('sites','site_id,nom_site,actif','&actif=eq.true'),
      authApi('detenteurs_stock','detenteur_stock_id,type_detenteur,site_id,destockeur_user_id,actif','&actif=eq.true')
    ]);
    if(currentContext().id!==contextId)return;
    patronDashboardData=buildPatronDashboardData({revenues,moneyFlows,stockFlows,networkStock,movements,sites,holders,startIso});
    renderPatronDashboard(patronDashboardData);
    const status=document.getElementById('metric-status');if(status)status.textContent=`Données calculées pour ${patronPeriodLabel().toLowerCase()} · stock à l’instant présent`;
  }catch(error){const status=document.getElementById('metric-status');if(status)status.textContent=`Indicateurs indisponibles : ${error.message}`}
}

function buildPatronDashboardData(raw){
  const siteNames=Object.fromEntries(raw.sites.map(site=>[site.site_id,site.nom_site]));
  const holderInfo={},holderBySite={};
  for(const row of raw.networkStock)if(!holderInfo[row.detenteur_stock_id])holderInfo[row.detenteur_stock_id]={id:row.detenteur_stock_id,name:row.detenteur_nom,type:row.type_detenteur,units:0,refs:0,low:0};
  for(const row of raw.networkStock){if(!row.reference_produit_id)continue;const h=holderInfo[row.detenteur_stock_id];h.units+=Number(row.quantite||0);h.refs++;if(Number(row.quantite||0)<=3)h.low++}
  for(const holder of raw.holders)if(holder.site_id)holderBySite[holder.site_id]=holder.detenteur_stock_id;
  const revenueBySite={};for(const row of raw.revenues){const entry=revenueBySite[row.site_id]??={siteId:row.site_id,name:siteNames[row.site_id]||'Point de vente',cash:0,mobile:0,total:0};entry.cash+=Number(row.montant_cash||0);entry.mobile+=Number(row.montant_mobile_money||0);entry.total=entry.cash+entry.mobile}
  const periodMoney=raw.moneyFlows.filter(flow=>new Date(flow.cree_le)>=new Date(raw.startIso));
  const closedByHolder={};for(const flow of periodMoney.filter(flow=>flow.type_flux==='REMISE'&&flow.statut==='CLOTURE'))closedByHolder[flow.detenteur_source_id]=(closedByHolder[flow.detenteur_source_id]||0)+Number(flow.montant_cash||0)+Number(flow.montant_mobile_money||0);
  const unremitted=Object.values(revenueBySite).map(site=>{const holderId=holderBySite[site.siteId],remitted=closedByHolder[holderId]||0;return{...site,holderId,remitted,amount:Math.max(0,site.total-remitted)}}).filter(row=>row.amount>0).sort((a,b)=>b.amount-a.amount);
  const periodMovements=raw.movements.filter(row=>new Date(row.cree_le)>=new Date(raw.startIso));
  const refToProduct={};for(const product of products)for(const ref of product.refs)refToProduct[ref.id]={product,ref};
  const productMap={};for(const movement of periodMovements.filter(row=>Number(row.variation_quantite)<0)){const info=refToProduct[movement.reference_produit_id],key=info?.product.id||movement.reference_produit_id,entry=productMap[key]??={productId:info?.product.id||'',referenceId:movement.reference_produit_id,name:info?`${info.product.brand} ${info.product.name}`:(movement.reference_libelle||movement.sku_interne||'Référence'),sku:info?.ref.sku||movement.sku_interne||'',photo:info?.ref.photo||info?.product.photo||'',out:0,current:0};entry.out+=Math.abs(Number(movement.variation_quantite||0))}
  const currentByRef={};for(const row of raw.networkStock)currentByRef[row.reference_produit_id]=(currentByRef[row.reference_produit_id]||0)+Number(row.quantite||0);
  const topProducts=Object.values(productMap).map(item=>({...item,current:currentByRef[item.referenceId]||0})).sort((a,b)=>b.out-a.out).slice(0,10);
  const declining=[...topProducts].filter(item=>item.current<=Math.max(3,item.out)).sort((a,b)=>a.current-b.current);
  const stockAlerts=raw.stockFlows.filter(flow=>flow.statut==='ANOMALIE');
  const moneyAlerts=raw.moneyFlows.filter(flow=>['A_VALIDER_PATRON','ANOMALIE_PATRON'].includes(flow.statut));
  const stale=raw.stockFlows.filter(flow=>!['CLOTURE','REFUSE','ANOMALIE'].includes(flow.statut)&&Date.now()-new Date(flow.cree_le).getTime()>48*60*60*1000);
  const alerts=[...stockAlerts.map(x=>({tone:'danger',label:'CRITIQUE',title:'Anomalie de stock',detail:`Flux ${x.flux_stock_id.slice(0,8)} à enquêter`,date:x.cree_le,action:`patronAnomalyDetail('${x.flux_stock_id}')`})),...moneyAlerts.map(x=>({tone:'warning',label:'À VALIDER',title:'Décision financière',detail:`${patronCurrency(Number(x.montant_cash||0)+Number(x.montant_mobile_money||0))} · ${moneyStatus(x.statut)}`,date:x.cree_le,action:`patronMoneyAction('${x.flux_argent_id}')`})),...stale.map(x=>({tone:'notice',label:'À SURVEILLER',title:'Flux ouvert depuis plus de 48 h',detail:`Flux ${x.flux_stock_id.slice(0,8)}`,date:x.cree_le,action:`patronStockFlowDetail('${x.flux_stock_id}')`}))].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  return{...raw,siteNames,holderInfo,revenueBySite:Object.values(revenueBySite).sort((a,b)=>b.total-a.total),unremitted,topProducts,declining,alerts,networkUnits:Object.values(holderInfo).reduce((sum,h)=>sum+h.units,0),revenueTotal:raw.revenues.reduce((sum,r)=>sum+Number(r.montant_cash||0)+Number(r.montant_mobile_money||0),0),unremittedTotal:unremitted.reduce((sum,r)=>sum+r.amount,0)}
}

function renderPatronDashboard(data){
  setMetric('patron-kpi-revenue',patronCurrency(data.revenueTotal));setMetric('patron-kpi-unremitted',patronCurrency(data.unremittedTotal));setMetric('patron-kpi-stock',`${data.networkUnits.toLocaleString('fr-FR')} unités`);setMetric('patron-kpi-alerts',data.alerts.length);
  setAttentionCount(data.alerts.length);
  const maxRevenue=Math.max(1,...data.revenueBySite.map(row=>row.total));
  const chart=document.getElementById('patron-revenue-chart');if(chart)chart.innerHTML=data.revenueBySite.slice(0,5).map(row=>`<button class="patron-revenue-row" onclick="patronDashboardDetail('revenue','${row.siteId}')"><span>${esc(row.name)}</span><i><b style="width:${Math.max(4,row.total/maxRevenue*100)}%"></b></i><strong>${patronCurrency(row.total)}</strong><small>Cash ${patronCurrency(row.cash)} · Mobile ${patronCurrency(row.mobile)}</small></button>`).join('')||'<div class="empty">Aucune recette sur cette période.</div>';
  const alerts=document.getElementById('patron-priority-alerts');if(alerts)alerts.innerHTML=data.alerts.slice(0,4).map(item=>`<button class="patron-alert-row ${item.tone}" onclick="${item.action}"><span>${item.label}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.detail)} · ${new Date(item.date).toLocaleDateString('fr-FR')}</small></div><i>→</i></button>`).join('')||'<div class="manager-all-clear"><b>✓</b><div><strong>Tout est à jour</strong><span>Aucune alerte prioritaire.</span></div></div>';
  const top=document.getElementById('patron-top-products');if(top)top.innerHTML=data.topProducts.slice(0,4).map((item,index)=>patronProductRow(item,index+1)).join('')||'<div class="empty">Aucune sortie de stock sur cette période.</div>';
  const holders=document.getElementById('patron-stock-holders');if(holders)holders.innerHTML=Object.values(data.holderInfo).sort((a,b)=>b.units-a.units).slice(0,4).map(h=>`<button class="patron-compact-row" onclick="patronStockDetail('${h.id}')"><span class="patron-row-icon">${h.type==='DESTOCKEUR'?'↗':'⌂'}</span><div><strong>${esc(h.name)}</strong><small>${h.refs} références · ${h.low} stock${h.low>1?'s':''} faible${h.low>1?'s':''}</small></div><b>${h.units.toLocaleString('fr-FR')} u.</b></button>`).join('')||'<div class="empty">Aucun stock.</div>';
  const unpaid=document.getElementById('patron-unremitted-list');if(unpaid)unpaid.innerHTML=data.unremitted.slice(0,4).map(row=>`<button class="patron-compact-row" onclick="patronDashboardDetail('unremitted','${row.siteId}')"><span class="patron-row-icon money">₣</span><div><strong>${esc(row.name)}</strong><small>${row.remitted?`${patronCurrency(row.remitted)} déjà remis`:'Aucune remise clôturée sur la période'}</small></div><b>${patronCurrency(row.amount)}</b></button>`).join('')||'<div class="manager-all-clear"><b>✓</b><div><strong>Tout est remis</strong><span>Aucun solde calculé sur la période.</span></div></div>'
}

function patronProductRow(item,index){const target=item.productId?`catalogProduct('${item.productId}')`:`patronDashboardDetail('products')`;return `<button class="patron-product-row" onclick="${target}"><span class="patron-rank">${index}</span><div class="patron-product-photo">${item.photo?`<img src="${esc(catalogImageUrl(item.photo,120,55))}" alt="">`:'🧴'}</div><div><strong>${esc(item.name)}</strong><small>${esc(item.sku||'SKU non renseigné')} · stock réseau ${item.current}</small></div><b>${item.out} sorties</b></button>`}

function patronDashboardDetail(kind,id=''){
  const d=patronDashboardData;if(!d)return home();const filter=patronPeriodButtons(),head=(title,description)=>`<main class="patron-detail"><div class="page-head"><div><span class="eyebrow">PATRON · ${patronPeriodLabel().toUpperCase()}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${filter}</div>`;let content='';
  if(kind==='revenue'){const rows=id?d.revenueBySite.filter(row=>row.siteId===id):d.revenueBySite;content=head('Recettes par point de vente','Comparaison du cash et du Mobile Money déclarés.')+`<section class="list">${rows.map(row=>`<article class="product-row"><div class="grow"><small>POINT DE VENTE</small><strong>${esc(row.name)}</strong><span>Cash ${patronCurrency(row.cash)} · Mobile Money ${patronCurrency(row.mobile)}</span></div><div class="stock-quantity"><strong>${patronCurrency(row.total)}</strong><small>Total</small></div></article>`).join('')||'<div class="empty">Aucune recette sur cette période.</div>'}</section></main>`}
  if(kind==='unremitted'){const rows=id?d.unremitted.filter(row=>row.siteId===id):d.unremitted;content=head('Argent non remis','Recettes déclarées moins les remises clôturées sur la période.')+`<div class="patron-method-note"><strong>Mode de calcul</strong><span>Ce solde est un indicateur de pilotage. Une remise ouverte ou contestée reste considérée comme non clôturée.</span></div><section class="list">${rows.map(row=>`<article class="product-row"><div class="grow"><small>${row.remitted?'REMISE PARTIELLE':'À REMETTRE'}</small><strong>${esc(row.name)}</strong><span>Recettes ${patronCurrency(row.total)} · remises clôturées ${patronCurrency(row.remitted)}</span></div><div class="stock-quantity"><strong>${patronCurrency(row.amount)}</strong><small>Non remis</small></div></article>`).join('')||'<div class="empty">Aucun montant non remis.</div>'}</section><button class="primary secondary" onclick="patronMoney()">Voir tous les mouvements financiers</button></main>`}
  if(kind==='stock'){content=head('Stock du réseau','Quantités actuellement détenues par les sites et activités mobiles.')+`<section class="list">${Object.values(d.holderInfo).sort((a,b)=>b.units-a.units).map(h=>`<article class="product-row"><div class="grow"><small>${h.type==='DESTOCKEUR'?'ACTIVITÉ MOBILE':'SITE PHYSIQUE'}</small><strong>${esc(h.name)}</strong><span>${h.refs} références · ${h.low} stock${h.low>1?'s':''} faible${h.low>1?'s':''}</span></div><button onclick="patronStockDetail('${h.id}')">${h.units.toLocaleString('fr-FR')} u. →</button></article>`).join('')}</section></main>`}
  if(kind==='alerts'){content=head('Alertes du réseau','Anomalies et opérations qui nécessitent une décision.')+`<section class="manager-task-list">${d.alerts.map(item=>managerHomeTask(item.label,item.tone,item.title,item.detail,item.action,'Examiner')).join('')||'<div class="manager-all-clear"><b>✓</b><div><strong>Tout est à jour</strong><span>Aucune alerte ouverte.</span></div></div>'}</section></main>`}
  if(kind==='products'){content=head('Produits les plus sortis','Sorties physiques enregistrées ; ce classement ne représente pas encore les ventes en caisse.')+`<section class="patron-dashboard-panel"><div class="patron-compact-list">${d.topProducts.map((item,index)=>patronProductRow(item,index+1)).join('')||'<div class="empty">Aucune sortie sur cette période.</div>'}</div></section><section class="patron-dashboard-panel patron-decline-panel"><div class="patron-panel-head"><div><small>À SURVEILLER</small><h2>Stock faible après les sorties</h2></div></div><div class="patron-compact-list">${d.declining.map((item,index)=>patronProductRow(item,index+1)).join('')||'<div class="empty">Aucune baisse préoccupante détectée.</div>'}</div></section></main>`}
  shell(content||head('Détail indisponible','Cette vue ne contient aucune donnée.')+'</main>','home()')
}
