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
    const ids=lines.map(l=>l.ligne_flux_stock_id);
    const events=ids.length?await authApi('evenements_lignes_flux_stock','ligne_flux_stock_id,quantite,decision,commentaire,cree_le',`&type_evenement=eq.DECISION_MAGASINIER&ligne_flux_stock_id=in.(${ids.join(',')})`):[];
    const em=Object.fromEntries(events.map(e=>[e.ligne_flux_stock_id,e]));
    const editable=['DEMANDE','EN_TRAITEMENT'].includes(f.statut);
    shell(`<div class="title"><small>DEMANDE ${esc(id.slice(0,8))}</small><h1>Boutique 104</h1><p>${esc(new Date(f.cree_le).toLocaleString('fr-FR'))} · ${esc(f.statut)}</p></div><section class="list">${lines.map(l=>{const e=em[l.ligne_flux_stock_id];const canShip=f.statut==='EN_TRAITEMENT'&&e&&['VALIDE','MODIFIE','AJOUTE'].includes(e.decision);return `<article class="product-row"><div class="grow"><strong>${esc(rm[l.reference_produit_id]||'Référence')}</strong><span>Quantité demandée : ${l.quantite_demandee}</span>${e?`<span><b>Décision : ${esc(e.decision)}</b> · Quantité : ${e.quantite}</span>${e.commentaire?`<small>${esc(e.commentaire)}</small>`:''}`:''}</div>${!e&&editable?`<button onclick="lineDecision('${id}','${l.ligne_flux_stock_id}',${l.quantite_demandee})">Décider</button>`:canShip?`<button class="primary" onclick="shipRequest('${id}')">🚚 Expédier ${e.quantite}</button>`:''}</article>`}).join('')}</section>${f.statut==='EN_TRAITEMENT'?'<div class="empty">Les lignes validées sont prêtes à être expédiées. Le stock sera débité uniquement après confirmation sécurisée.</div>':editable?'<div class="empty">La quantité demandée reste inchangée. Toute décision de Joel est enregistrée séparément dans l’historique.</div>':'<div class="empty">Cette demande ne peut plus recevoir de nouvelle décision à ce stade.</div>'}`,'requestsInbox()');
  }catch(err){shell(`<div class="title"><small>ERREUR</small><h1>Demande inaccessible</h1><p>${esc(err.message)}</p></div>`,'requestsInbox()')}
}
function lineDecision(fluxId,lineId,requested){shell(`<div class="title"><small>DÉCISION MAGASINIER</small><h1>Décider la ligne</h1><p>Quantité demandée : <b>${requested}</b></p></div><label>Commentaire (optionnel)</label><input id="decisionComment" maxlength="300" placeholder="Ex. stock disponible limité"><button class="primary" onclick="submitLineDecision('${fluxId}','${lineId}','VALIDE',${requested})">✓ Accepter ${requested}</button><div class="empty">Modifier la quantité préparée :</div><input id="decisionQty" type="number" min="1" step="1" value="${requested}"><button class="primary secondary" onclick="submitModifiedDecision('${fluxId}','${lineId}',${requested})">Modifier</button><button class="primary secondary" onclick="submitLineDecision('${fluxId}','${lineId}','REFUSE',0)">Refuser la ligne</button>`,`requestDetail('${fluxId}')`)}
function submitModifiedDecision(fluxId,lineId,requested){const q=Number(document.querySelector('#decisionQty').value);if(!Number.isInteger(q)||q<=0){alert('Entre une quantité entière supérieure à zéro.');return}if(q===requested){alert('La quantité est identique à la demande. Utilise Accepter.');return}submitLineDecision(fluxId,lineId,'MODIFIE',q)}
async function submitLineDecision(fluxId,lineId,decision,qty){const comment=document.querySelector('#decisionComment')?.value?.trim()||null;if(decision==='REFUSE'&&!confirm('Confirmer le refus de cette ligne ?'))return;try{await request('/rest/v1/rpc/traiter_ligne_demande_stock',{method:'POST',auth:true,body:{p_ligne_flux_stock_id:lineId,p_decision:decision,p_quantite:qty,p_commentaire:comment}});await requestDetail(fluxId)}catch(err){alert(err.message)}}
async function shipRequest(fluxId){
  if(!confirm('Confirmer l’expédition des quantités validées ? Le stock du dépôt sera débité.'))return;
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{
    await request('/rest/v1/rpc/expedier_demande_stock',{method:'POST',auth:true,body:{p_flux_stock_id:fluxId,p_commentaire:'Expédition confirmée par le magasinier depuis Boutique Manager'}});
    shell(`<div class="success"><div>🚚</div><h1>Stock expédié</h1><p>Le mouvement de stock est enregistré et la demande est maintenant en transit vers Boutique 104.</p><button class="primary" onclick="requestsInbox()">Retour aux demandes</button></div>`);
  }catch(err){shell(`<div class="title"><small>EXPÉDITION REFUSÉE</small><h1>Aucun stock n’a été modifié</h1><p>${esc(err.message)}</p></div><button class="primary" onclick="requestDetail('${fluxId}')">Retour</button>`,'requestsInbox()')}
}
