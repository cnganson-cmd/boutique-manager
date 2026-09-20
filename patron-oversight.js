// Pilotage réseau du Patron. Ces vues restent en lecture seule : la
// configuration des détenteurs et des routes appartient à l'Administrateur.
async function patronNetworkStock(holderId=null){
  return request('/rest/v1/rpc/consulter_stocks_reseau',{
    method:'POST',auth:true,body:{p_detenteur_stock_id:holderId}
  })
}

async function patronStocks(){
  shell('<div class="title"><small>PATRON · STOCK</small><h1>Stock par détenteur</h1><p>Chargement des stocks physiques et mobiles…</p></div>','home()');
  try{
    const rows=await patronNetworkStock(),holders=new Map();
    for(const row of rows){
      if(!holders.has(row.detenteur_stock_id))holders.set(row.detenteur_stock_id,{id:row.detenteur_stock_id,name:row.detenteur_nom,type:row.type_detenteur,active:row.detenteur_actif,lines:0,units:0});
      const holder=holders.get(row.detenteur_stock_id);
      if(row.reference_produit_id){holder.lines++;holder.units+=Number(row.quantite||0)}
    }
    const items=[...holders.values()];
    shell(`<div class="title"><small>PATRON · STOCK</small><h1>Stock par détenteur</h1><p>${items.length} détenteur${items.length>1?'s':''} · sélectionnez-en un pour voir ses produits.</p></div><section class="list">${items.map(holder=>`<article class="product-row"><div class="grow"><small>${holder.type==='DESTOCKEUR'?'ACTIVITÉ MOBILE':'SITE PHYSIQUE'} · ${holder.active?'Actif':'Inactif'}</small><strong>${esc(holder.name)}</strong><span>${holder.units} unité${holder.units>1?'s':''} · ${holder.lines} référence${holder.lines>1?'s':''}</span></div><button aria-label="Voir le stock de ${esc(holder.name)}" onclick="patronStockDetail('${holder.id}')">→</button></article>`).join('')||'<div class="empty">Aucun détenteur de stock.</div>'}</section>`,'home()');
  }catch(error){shell(`<div class="title"><small>ERREUR</small><h1>Stock indisponible</h1><p>${esc(error.message)}</p></div><button class="primary" onclick="patronStocks()">Réessayer</button>`,'home()')}
}

async function patronStockDetail(holderId){
  shell('<div class="title"><small>PATRON · STOCK</small><h1>Chargement…</h1></div>','patronStocks()');
  try{
    const rows=await patronNetworkStock(holderId);
    if(!rows.length)throw new Error('Détenteur introuvable');
    const holder=rows[0],stock=rows.filter(row=>row.reference_produit_id).sort((a,b)=>Number(b.quantite)-Number(a.quantite));
    const total=stock.reduce((sum,row)=>sum+Number(row.quantite||0),0);
    shell(`<div class="title"><small>${holder.type_detenteur==='DESTOCKEUR'?'ACTIVITÉ MOBILE':'SITE PHYSIQUE'} · ${holder.detenteur_actif?'ACTIF':'INACTIF'}</small><h1>${esc(holder.detenteur_nom)}</h1><p>${total} unité${total>1?'s':''} · ${stock.length} référence${stock.length>1?'s':''}</p></div><section class="list">${stock.map(row=>`<article class="product-row"><div class="grow"><small>${esc(row.marque_nom||'Sans marque')}</small><strong>${esc(row.produit_nom||row.reference_libelle||'Référence')}</strong><span>${esc(row.variante||'')}${row.variante?' · ':''}${esc(row.reference_libelle||'')}</span></div><div class="stock-quantity"><strong>${Number(row.quantite||0)}</strong><small>unités</small></div></article>`).join('')||'<div class="empty">Aucun produit en stock chez ce détenteur.</div>'}</section>`,'patronStocks()');
  }catch(error){shell(`<div class="title"><small>ERREUR</small><h1>Détail indisponible</h1><p>${esc(error.message)}</p></div>`,'patronStocks()')}
}

async function patronHolderLabels(flows){
  const ids=[...new Set(flows.flatMap(flow=>[flow.detenteur_source_id,flow.detenteur_destination_id]).filter(Boolean))];
  if(!ids.length)return {};
  // La RPC applique CONSULTER_STOCK et fournit les libellés sans ouvrir les
  // tables sites/utilisateurs, volontairement plus restrictives sous RLS.
  const rows=await patronNetworkStock(),labels={};
  for(const row of rows){
    if(ids.includes(row.detenteur_stock_id)&&!labels[row.detenteur_stock_id])labels[row.detenteur_stock_id]=row.type_detenteur==='DESTOCKEUR'?`${row.detenteur_nom} · mobile`:row.detenteur_nom;
  }
  return labels
}

async function patronStockFlows(){
  shell('<div class="title"><small>PATRON · FLUX</small><h1>Flux de stock</h1><p>Chargement de l’historique du réseau…</p></div>','home()');
  try{
    const [flows,types]=await Promise.all([authApi('flux_stock','flux_stock_id,type_flux_stock_id,detenteur_source_id,detenteur_destination_id,statut,cree_le','&order=cree_le.desc&limit=100'),authApi('types_flux_stock','type_flux_stock_id,nom_type_flux,code_type_flux')]);
    const labels=await patronHolderLabels(flows),typeNames=Object.fromEntries(types.map(t=>[t.type_flux_stock_id,t.nom_type_flux||t.code_type_flux]));
    shell(`<div class="title"><small>PATRON · FLUX</small><h1>Flux de stock</h1><p>${flows.length} dernier${flows.length>1?'s':''} flux du réseau.</p></div><section class="list">${flows.map(flow=>`<article class="product-row"><div class="grow"><small>${esc(typeNames[flow.type_flux_stock_id]||'Flux')} · ${esc(new Date(flow.cree_le).toLocaleString('fr-FR'))}</small><strong>${esc(labels[flow.detenteur_source_id]||'Source')} → ${esc(labels[flow.detenteur_destination_id]||'Destination')}</strong><span>${esc(flowHumanStatus(flow.statut))}</span></div><button aria-label="Voir le flux" onclick="patronStockFlowDetail('${flow.flux_stock_id}')">→</button></article>`).join('')||'<div class="empty">Aucun flux de stock.</div>'}</section>`,'home()');
  }catch(error){shell(`<div class="title"><small>ERREUR</small><h1>Flux indisponibles</h1><p>${esc(error.message)}</p></div><button class="primary" onclick="patronStockFlows()">Réessayer</button>`,'home()')}
}

async function patronStockFlowDetail(flowId){
  try{
    const flows=await authApi('flux_stock','flux_stock_id,type_flux_stock_id,detenteur_source_id,detenteur_destination_id,statut,cree_le',`&flux_stock_id=eq.${encodeURIComponent(flowId)}`);
    if(!flows.length)throw new Error('Flux introuvable');
    const flow=flows[0];
    const [labels,types,lines]=await Promise.all([patronHolderLabels(flows),authApi('types_flux_stock','type_flux_stock_id,nom_type_flux,code_type_flux',`&type_flux_stock_id=eq.${flow.type_flux_stock_id}`),authApi('lignes_flux_stock','ligne_flux_stock_id,reference_produit_id,quantite_demandee',`&flux_stock_id=eq.${encodeURIComponent(flowId)}`)]);
    // Le catalogue est déjà exposé en lecture publique ; l'utiliser ici évite
    // d'élargir les politiques RLS réservées aux opérations métier.
    const referenceIds=[...new Set(lines.map(l=>l.reference_produit_id))],references=referenceIds.length?await request(`/rest/v1/references_produit?select=reference_produit_id,libelle_reference&reference_produit_id=in.(${referenceIds.join(',')})`):[],referenceNames=Object.fromEntries(references.map(r=>[r.reference_produit_id,r.libelle_reference]));
    shell(`<div class="title"><small>${esc(types[0]?.nom_type_flux||types[0]?.code_type_flux||'FLUX')} · ${esc(flow.flux_stock_id.slice(0,8))}</small><h1>${esc(flowHumanStatus(flow.statut))}</h1><p>${esc(labels[flow.detenteur_source_id]||'Source')} → ${esc(labels[flow.detenteur_destination_id]||'Destination')}</p></div><section class="list">${lines.map(line=>`<article class="product-row"><div class="grow"><strong>${esc(referenceNames[line.reference_produit_id]||'Référence')}</strong><span>Quantité demandée : ${line.quantite_demandee}</span></div></article>`).join('')||'<div class="empty">Aucune ligne.</div>'}</section>`,'patronStockFlows()');
  }catch(error){shell(`<div class="title"><small>ERREUR</small><h1>Flux inaccessible</h1><p>${esc(error.message)}</p></div>`,'patronStockFlows()')}
}
