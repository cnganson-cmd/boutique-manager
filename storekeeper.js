async function requestDetail(id){
  shell(`<div class="title"><small>DEMANDE</small><h1>Chargement…</h1></div>`,'requestsInbox()');
  try{
    const flows=await authApi('flux_stock','flux_stock_id,demandeur_user_id,statut,cree_le',`&flux_stock_id=eq.${encodeURIComponent(id)}`);
    if(flows.length!==1)throw new Error('Demande inaccessible');
    const f=flows[0];
    const lines=await authApi('lignes_flux_stock','ligne_flux_stock_id,reference_produit_id,quantite_demandee',`&flux_stock_id=eq.${encodeURIComponent(id)}`);
    const refIds=[...new Set(lines.map(l=>l.reference_produit_id))];
    const refs=refIds.length?await request(`/rest/v1/references_produit?select=reference_produit_id,libelle_reference&reference_produit_id=in.(${refIds.join(',')})`):[];
    const rm=Object.fromEntries(refs.map(r=>[r.reference_produit_id,r.libelle_reference]));
    let events=[];
    try{events=await authApi('evenements_lignes_flux_stock','ligne_flux_stock_id,quantite,decision,commentaire,cree_le',`&type_evenement=eq.DECISION_MAGASINIER`)}catch(e){console.warn(e)}
    const em=Object.fromEntries(events.map(e=>[e.ligne_flux_stock_id,e]));
    shell(`<div class="title"><small>DEMANDE ${esc(id.slice(0,8))}</small><h1>Boutique 104</h1><p>${esc(new Date(f.cree_le).toLocaleString('fr-FR'))} · ${esc(f.statut)}</p></div><section class="list">${lines.map(l=>{const e=em[l.ligne_flux_stock_id];return `<article class="product-row"><div class="grow"><strong>${esc(rm[l.reference_produit_id]||'Référence')}</strong><span>Quantité demandée : ${l.quantite_demandee}</span>${e?`<span><b>Décision Joel :</b> ${esc(e.decision)} · quantité ${e.quantite}</span>`:`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button onclick="decideLine('${id}','${l.ligne_flux_stock_id}','VALIDE',${l.quantite_demandee})">✓ Accepter</button><button onclick="editLineDecision('${id}','${l.ligne_flux_stock_id}',${l.quantite_demandee})">✎ Modifier</button><button onclick="decideLine('${id}','${l.ligne_flux_stock_id}','REFUSE',0)">× Refuser</button></div>`}</div></article>`}).join('')}</section><div class="empty">La quantité demandée reste inchangée. Toute décision du magasinier est enregistrée comme un nouvel événement d'historique.</div>`,'requestsInbox()');
  }catch(err){shell(`<div class="title"><small>ERREUR</small><h1>Demande inaccessible</h1><p>${esc(err.message)}</p></div>`,'requestsInbox()')}
}
function editLineDecision(fluxId,lineId,requested){
  shell(`<div class="title"><small>MODIFIER LA QUANTITÉ</small><h1>Décision magasinier</h1><p>Quantité demandée par Georges : ${requested}</p></div><label>Quantité proposée par Joel</label><input id="storekeeperQty" type="number" min="1" value="${requested}"><label>Commentaire (optionnel)</label><input id="storekeeperComment" type="text" placeholder="Pourquoi cette modification ?"><button class="primary" onclick="submitModifiedDecision('${fluxId}','${lineId}',${requested})">Enregistrer la modification</button>` ,`requestDetail('${fluxId}')`)
}
async function submitModifiedDecision(fluxId,lineId,requested){
  const q=Number(document.querySelector('#storekeeperQty').value),comment=document.querySelector('#storekeeperComment').value.trim();
  if(!Number.isInteger(q)||q<=0){alert('Saisis une quantité entière positive.');return}
  if(q===requested){alert('La quantité modifiée doit être différente de la quantité demandée. Pour garder la même quantité, utilise Accepter.');return}
  await decideLine(fluxId,lineId,'MODIFIE',q,comment)
}
async function decideLine(fluxId,lineId,decision,quantity,comment=null){
  try{
    await request('/rest/v1/rpc/traiter_ligne_demande_stock',{method:'POST',auth:true,body:{p_ligne_flux_stock_id:lineId,p_decision:decision,p_quantite:quantity,p_commentaire:comment}});
    await requestDetail(fluxId)
  }catch(err){shell(`<div class="title"><small>DÉCISION REFUSÉE</small><h1>Aucune modification enregistrée</h1><p>${esc(err.message)}</p></div><button class="primary" onclick="requestDetail('${fluxId}')">Retour à la demande</button>`,'requestsInbox()')}
}