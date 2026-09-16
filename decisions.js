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
    const events=await authApi('evenements_lignes_flux_stock','ligne_flux_stock_id,quantite,decision,commentaire,cree_le',`&type_evenement=eq.DECISION_MAGASINIER&ligne_flux_stock_id=in.(${lines.map(l=>l.ligne_flux_stock_id).join(',')})`);
    const em=Object.fromEntries(events.map(e=>[e.ligne_flux_stock_id,e]));
    const editable=['DEMANDE','EN_TRAITEMENT'].includes(f.statut);
    shell(`<div class="title"><small>DEMANDE ${esc(id.slice(0,8))}</small><h1>Boutique 104</h1><p>${esc(new Date(f.cree_le).toLocaleString('fr-FR'))} · ${esc(f.statut)}</p></div><section class="list">${lines.map(l=>{const e=em[l.ligne_flux_stock_id];return `<article class="product-row"><div class="grow"><strong>${esc(rm[l.reference_produit_id]||'Référence')}</strong><span>Quantité demandée : ${l.quantite_demandee}</span>${e?`<span><b>Décision : ${esc(e.decision)}</b> · Quantité : ${e.quantite}</span>${e.commentaire?`<small>${esc(e.commentaire)}</small>`:''}`:''}</div>${!e&&editable?`<button onclick="lineDecision('${id}','${l.ligne_flux_stock_id}',${l.quantite_demandee},'${esc((rm[l.reference_produit_id]||'Référence').replace(/'/g,"&#39;"))}')">Décider</button>`:''}</article>`}).join('')}</section>${editable?'<div class="empty">La quantité demandée reste inchangée. Toute décision de Joel est enregistrée séparément dans l’historique.</div>':'<div class="empty">Cette demande ne peut plus recevoir de nouvelle décision à ce stade.</div>'}`,'requestsInbox()');
  }catch(err){shell(`<div class="title"><small>ERREUR</small><h1>Demande inaccessible</h1><p>${esc(err.message)}</p></div>`,'requestsInbox()')}
}

function lineDecision(fluxId,lineId,requested,label){
  shell(`<div class="title"><small>DÉCISION MAGASINIER</small><h1>${label}</h1><p>Quantité demandée par la boutique : <b>${requested}</b></p></div><section class="list"><article class="product-row"><div class="grow"><strong>Accepter la demande</strong><span>Conserver exactement ${requested}</span></div><button onclick="submitLineDecision('${fluxId}','${lineId}','VALIDE',${requested})">Accepter</button></article><article class="product-row"><div class="grow"><strong>Modifier la quantité</strong><span>La demande originale restera ${requested}</span><label>Quantité proposée</label><input id="decisionQty" type="number" min="1" step="1" value="${requested}"></div><button onclick="submitModifiedDecision('${fluxId}','${lineId}',${requested})">Modifier</button></article><article class="product-row"><div class="grow"><strong>Refuser cette ligne</strong><span>Aucune quantité ne sera proposée</span></div><button onclick="submitLineDecision('${fluxId}','${lineId}','REFUSE',0)">Refuser</button></article></section><label>Commentaire facultatif</label><input id="decisionComment" type="text" maxlength="300" placeholder="Motif ou précision…">` ,`requestDetail('${fluxId}')`);
}

async function submitModifiedDecision(fluxId,lineId,requested){
  const q=Number(document.querySelector('#decisionQty')?.value);
  if(!Number.isInteger(q)||q<=0){alert('Entre une quantité entière supérieure à 0.');return}
  if(q===requested){alert('Pour garder la même quantité, utilise Accepter.');return}
  await submitLineDecision(fluxId,lineId,'MODIFIE',q);
}

async function submitLineDecision(fluxId,lineId,decision,qty){
  const comment=document.querySelector('#decisionComment')?.value?.trim()||null;
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{
    await request('/rest/v1/rpc/traiter_ligne_demande_stock',{method:'POST',auth:true,body:{p_ligne_flux_stock_id:lineId,p_decision:decision,p_quantite:qty,p_commentaire:comment}});
    shell(`<div class="success"><div>✓</div><h1>Décision enregistrée</h1><p>${decision==='VALIDE'?'Quantité acceptée : '+qty:decision==='MODIFIE'?'Nouvelle quantité proposée : '+qty:'Ligne refusée'}. La quantité demandée d’origine reste conservée dans l’historique.</p><button class="primary" onclick="requestDetail('${fluxId}')">Retour à la demande</button></div>`);
  }catch(err){
    shell(`<div class="title"><small>DÉCISION REFUSÉE</small><h1>La décision n’a pas été enregistrée</h1><p>${esc(err.message)}</p></div><button class="primary" onclick="requestDetail('${fluxId}')">Retour</button>`,'requestsInbox()');
  }
}
