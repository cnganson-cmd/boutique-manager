// Vision stock du Magasinier. Toutes les lignes proviennent de RPC filtrées
// côté serveur : masquer un site dans l'interface ne constitue jamais le contrôle d'accès.
let stockNetworkRows=[],stockNetworkLoadedFor='';
async function loadAuthorizedNetworkStock(force=false){
  const contextId=currentContext().id;
  if(!force&&stockNetworkLoadedFor===contextId)return stockNetworkRows;
  stockNetworkRows=await request('/rest/v1/rpc/consulter_stocks_operationnels',{method:'POST',auth:true,body:{p_detenteur_stock_id:null,p_recherche:null}});
  stockNetworkLoadedFor=contextId;
  return stockNetworkRows;
}
function stockNetworkSearchText(row){return normText([row.sku_interne,row.marque_nom,row.produit_nom,row.variante,row.reference_libelle,row.detenteur_nom].join(' '))}
function stockNetworkGroups(rows){
  const groups=new Map();
  rows.forEach(row=>{const current=groups.get(row.reference_produit_id)||{...row,total:0,reserved:0,available:0,transit:0,sites:[]};current.total+=row.quantite_physique;current.reserved+=row.quantite_reservee;current.available+=row.quantite_disponible;current.transit+=row.quantite_en_transit;current.sites.push(row);groups.set(row.reference_produit_id,current)});
  return [...groups.values()].sort((a,b)=>(a.marque_nom+' '+a.produit_nom).localeCompare(b.marque_nom+' '+b.produit_nom,'fr'));
}
function renderStockNetwork(query=''){
  const words=normText(query).split(' ').filter(Boolean),rows=words.length?stockNetworkRows.filter(row=>words.every(word=>stockNetworkSearchText(row).includes(word))):stockNetworkRows,groups=stockNetworkGroups(rows);
  shell(`<div class="title"><small>STOCK AUTORISÉ</small><h1>Stock réseau</h1><p>Recherchez un SKU pour voir uniquement sa répartition dans les sites auxquels vous avez accès.</p></div><div class="search">⌕ <input id="stock-network-search" autocomplete="off" value="${esc(query)}" placeholder="SKU, produit ou site…" oninput="renderStockNetwork(this.value)"></div><div class="network-summary"><strong>${groups.length}</strong><span>référence${groups.length>1?'s':''} visible${groups.length>1?'s':''}</span><strong>${new Set(rows.map(row=>row.detenteur_stock_id)).size}</strong><span>détenteur(s) autorisé(s)</span></div><section class="list">${groups.map(group=>`<article class="product-row network-stock-row"><div class="photo">${catalogPhoto(group.photo_url,'🧴','',`Photo de ${group.produit_nom}`,240)}</div><div class="grow"><small>${esc(group.sku_interne)} · ${esc(group.marque_nom)}</small><strong>${esc(group.produit_nom)}${group.variante?` · ${esc(group.variante)}`:''}</strong><span>Physique ${group.total} · Réservé ${group.reserved} · Disponible ${group.available} · Transit ${group.transit}</span><small>${group.sites.length} emplacement(s)</small></div><button aria-label="Voir la répartition de ${esc(group.produit_nom)}" onclick="stockReferenceDistribution('${group.reference_produit_id}')">→</button></article>`).join('')||'<div class="empty-state"><b>⌕</b><h2>Aucun stock trouvé</h2><p>Vérifiez le SKU ou le nom recherché.</p></div>'}</section>${nav('stock')}`,'home()');
}
async function stockNetwork(){try{await loadAuthorizedNetworkStock();renderStockNetwork()}catch(e){adminError('Stock inaccessible',e,'home()')}}
function stockReferenceDistribution(referenceId){
  const rows=stockNetworkRows.filter(row=>row.reference_produit_id===referenceId),first=rows[0];if(!first)return stockNetwork();
  const total=rows.reduce((sum,row)=>sum+row.quantite_physique,0),reserved=rows.reduce((sum,row)=>sum+row.quantite_reservee,0),available=rows.reduce((sum,row)=>sum+row.quantite_disponible,0),transit=rows.reduce((sum,row)=>sum+row.quantite_en_transit,0);
  shell(`<div class="title"><small>${esc(first.sku_interne)}</small><h1>${esc(first.produit_nom)}</h1><p>${esc(first.reference_libelle)} · Physique ${total} · Réservé ${reserved} · Disponible ${available} · En transit ${transit}</p></div><div class="big-photo">${catalogPhoto(first.photo_url,'🧴','',`Photo de ${first.produit_nom}`,900)}</div><section class="list">${rows.sort((a,b)=>b.quantite_physique-a.quantite_physique).map(row=>`<article class="product-row"><div class="grow"><small>${esc(row.type_detenteur==='DESTOCKEUR'?'POINT MOBILE':'SITE PHYSIQUE')}</small><strong>${esc(row.detenteur_nom)}</strong><span>Mis à jour ${row.mis_a_jour_le?new Date(row.mis_a_jour_le).toLocaleString('fr-FR'):'—'}</span></div><div class="stock-quantity"><strong>${row.quantite_physique}</strong><small>Physique</small><small>Réservé ${row.quantite_reservee} · Disponible ${row.quantite_disponible} · Transit ${row.quantite_en_transit}</small></div></article>`).join('')}</section>${nav('stock')}`,'stockNetwork()');
}
async function authorizedStockMovements(){
  try{
    const rows=await request('/rest/v1/rpc/consulter_mouvements_stock_accessibles',{method:'POST',auth:true,body:{p_detenteur_stock_id:null,p_limite:100}});
    shell(`<div class="title"><small>STOCK AUTORISÉ</small><h1>Mouvements récents</h1><p>Les 100 derniers mouvements des sites auxquels vous avez accès.</p></div><section class="list">${rows.map(row=>`<article class="product-row"><div class="grow"><small>${esc(row.detenteur_nom)} · ${esc(row.sku_interne)}</small><strong>${esc(row.reference_libelle)}</strong><span>${esc(row.type_mouvement)} · ${new Date(row.cree_le).toLocaleString('fr-FR')}</span></div><strong class="stock-variation ${row.variation_quantite<0?'negative':'positive'}">${row.variation_quantite>0?'+':''}${row.variation_quantite}</strong></article>`).join('')||'<div class="empty-state"><b>↔</b><h2>Aucun mouvement</h2><p>Aucun mouvement autorisé n’est encore enregistré.</p></div>'}</section>${nav('stock')}`,'stockNetwork()');
  }catch(e){adminError('Mouvements inaccessibles',e,'stockNetwork()')}
}
