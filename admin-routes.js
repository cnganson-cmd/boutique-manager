function isAppAdmin(){return currentUser?.assignments?.some(a=>a.role==='ADMINISTRATEUR')}
async function setStockRoute(typeId,sourceId,destinationId,active,button=null){
  if(!isAppAdmin()){shell(`<div class="title"><small>SÉCURITÉ</small><h1>Modification refusée</h1><p>Votre compte n'a pas le rôle Administrateur.</p></div>`,'home()');return}
  if(button){button.disabled=true;button.textContent='Enregistrement…'}
  try{
    await request('/rest/v1/rpc/configurer_route_flux_stock',{method:'POST',auth:true,body:{p_type_flux_stock_id:typeId,p_detenteur_source_id:sourceId,p_detenteur_destination_id:destinationId,p_actif:active}});
    await adminStockRoutes(active?'Route activée.':'Route désactivée.');
  }catch(err){shell(`<div class="title"><small>ERREUR</small><h1>Modification refusée</h1><p>${esc(err.message)}</p></div><button class="primary" onclick="adminStockRoutes()">Retour aux routes</button>`,'home()')}
}
async function adminStockRoutes(message=''){
  if(!isAppAdmin()){shell(`<div class="title"><small>SÉCURITÉ</small><h1>Accès non autorisé</h1><p>Cette configuration est réservée à l'Administrateur.</p></div>`,'home()');return}
  shell(`<div class="title"><small>ADMINISTRATION</small><h1>Routes de stock</h1><p>Chargement de la configuration sécurisée…</p></div>`,'home()');
  try{
    const [routes,holders,types]=await Promise.all([
      authApi('routes_flux_stock','route_flux_stock_id,detenteur_source_id,detenteur_destination_id,type_flux_stock_id,actif'),
      authApi('detenteurs_stock','detenteur_stock_id,site_id,type_detenteur'),
      authApi('types_flux_stock','type_flux_stock_id,code_type_flux')
    ]);
    const siteIds=[...new Set(holders.filter(h=>h.site_id).map(h=>h.site_id))];
    const sites=siteIds.length?await authApi('sites','site_id,nom_site',`&site_id=in.(${siteIds.join(',')})`):[];
    const sm=Object.fromEntries(sites.map(s=>[s.site_id,s.nom_site]));
    const hm=Object.fromEntries(holders.map(h=>[h.detenteur_stock_id,h.site_id?(sm[h.site_id]||'Site'):'Détenteur stock']));
    const tm=Object.fromEntries(types.map(t=>[t.type_flux_stock_id,t.code_type_flux]));
    shell(`<div class="title"><small>ADMINISTRATION · ${esc(currentUser.nom)}</small><h1>Routes de stock</h1><p>${routes.length} route${routes.length>1?'s':''} configurée${routes.length>1?'s':''}</p>${message?`<p><strong>${esc(message)}</strong></p>`:''}</div><section class="list">${routes.map(r=>`<article class="product-row"><div class="grow"><small>${esc(tm[r.type_flux_stock_id]||'FLUX')}</small><strong>${esc(hm[r.detenteur_source_id]||'Source')} → ${esc(hm[r.detenteur_destination_id]||'Destination')}</strong><span>${r.actif?'✓ Active':'○ Inactive'}</span></div><button onclick="setStockRoute('${r.type_flux_stock_id}','${r.detenteur_source_id}','${r.detenteur_destination_id}',${!r.actif},this)">${r.actif?'Désactiver':'Activer'}</button></article>`).join('')||'<div class="empty">Aucune route configurée.</div>'}</section><div class="empty">L’Administrateur configure les routes. Les opérations de stock restent réservées aux rôles opérationnels autorisés.</div>`,'home()');
  }catch(err){shell(`<div class="title"><small>ERREUR</small><h1>Routes indisponibles</h1><p>${esc(err.message)}</p></div><button class="primary" onclick="adminStockRoutes()">Réessayer</button>`,'home()')}
}
