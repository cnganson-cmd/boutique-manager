// Inventaires physiques : comptage contrôlé, gel temporaire du détenteur et corrections traçables.
let activeInventoryId=null,activeInventoryRows=[];

function inventoryStatusLabel(status){return ({OUVERT:'En cours',CLOTURE:'Clôturé',ANNULE:'Annulé'})[status]||status}
async function inventoryHolder(){const holder=await contextHolder();if(!holder||holder.type_detenteur!=='SITE')throw new Error('Sélectionnez un site physique autorisé pour réaliser un inventaire.');return holder}

async function inventoryHome(){
  try{
    const globalPatron=currentContext().kind==='GLOBAL'&&hasRoleHere('PATRON');
    if(globalPatron){
      const [inventories,stock]=await Promise.all([
        request('/rest/v1/rpc/consulter_inventaires_stock',{method:'POST',auth:true,body:{p_detenteur_stock_id:null}}),
        request('/rest/v1/rpc/consulter_stocks_operationnels',{method:'POST',auth:true,body:{p_detenteur_stock_id:null,p_recherche:null}})
      ]);
      const holders=new Map();
      stock.filter(row=>row.type_detenteur==='SITE').forEach(row=>{
        const h=holders.get(row.detenteur_stock_id)||{id:row.detenteur_stock_id,name:row.detenteur_nom,units:0,available:0,reserved:0,transit:0};
        h.units+=Number(row.quantite_physique||0);h.available+=Number(row.quantite_disponible||0);h.reserved+=Number(row.quantite_reservee||0);h.transit+=Number(row.quantite_en_transit||0);holders.set(row.detenteur_stock_id,h);
      });
      const cards=[...holders.values()].map(h=>{
        const open=inventories.find(x=>x.detenteur_stock_id===h.id&&x.statut==='OUVERT');
        return `<article class="product-row"><div class="grow"><small>SITE PHYSIQUE</small><strong>${esc(h.name)}</strong><span>Physique ${h.units} · Disponible ${h.available} · Réservé ${h.reserved} · Transit ${h.transit}</span></div><button class="row-action" onclick="${open?`inventoryDetail('${open.inventaire_id}')`:`startInventoryForHolder('${h.id}')`}">${open?'Reprendre':'Ouvrir'}</button></article>`;
      }).join('');
      const history=inventories.map(row=>`<article class="product-row"><div class="grow"><small>${esc(row.code_inventaire)} · ${esc(inventoryStatusLabel(row.statut))}</small><strong>${row.lignes_comptees}/${row.total_lignes} références comptées</strong><span>${row.ecarts} écart(s) · ${new Date(row.ouvert_le).toLocaleString('fr-FR')}</span></div><button class="row-action" onclick="inventoryDetail('${row.inventaire_id}')">Consulter</button></article>`).join('');
      shell(`<div class="title"><small>PILOTAGE RÉSEAU</small><h1>Inventaires</h1><p>Sélectionnez un site physique pour ouvrir ou reprendre son inventaire. Un inventaire ouvert suspend ses mouvements de stock jusqu’à sa clôture ou son annulation.</p></div><section class="list">${cards||'<div class="empty">Aucun site physique autorisé.</div>'}</section><div class="section-heading"><small>HISTORIQUE</small><h2>Sessions d’inventaire</h2></div><section class="list">${history||'<div class="empty">Aucun inventaire enregistré.</div>'}</section>${nav('inventory')}`,'home()');
      return;
    }
    const holder=await inventoryHolder();
    const rows=await request('/rest/v1/rpc/consulter_inventaires_stock',{method:'POST',auth:true,body:{p_detenteur_stock_id:holder.detenteur_stock_id}});
    const open=rows.find(x=>x.statut==='OUVERT');
    shell(`<div class="title"><small>CONTRÔLE PHYSIQUE · ${esc(currentSiteContext()?.name||'Site')}</small><h1>Inventaires</h1><p>Les mouvements du détenteur sont suspendus pendant un inventaire ouvert, afin de garantir un comptage fiable.</p></div>${open?'<button class="primary" onclick="inventoryDetail(\''+open.inventaire_id+'\')">Reprendre l’inventaire en cours</button>':'<button class="primary" onclick="startInventory()">＋ Ouvrir un inventaire</button>'}<section class="list">${rows.map(row=>`<article class="product-row"><div class="grow"><small>${esc(row.code_inventaire)} · ${esc(inventoryStatusLabel(row.statut))}</small><strong>${row.lignes_comptees}/${row.total_lignes} références comptées</strong><span>${row.ecarts} écart(s) · ${new Date(row.ouvert_le).toLocaleString('fr-FR')}</span></div><button class="row-action" onclick="inventoryDetail('${row.inventaire_id}')">Consulter</button></article>`).join('')||'<div class="empty-state"><b>▤</b><h2>Aucun inventaire</h2><p>Ouvrez un inventaire pour lancer un comptage physique.</p></div>'}</section>${nav('inventory')}`,'home()');
  }catch(error){shell(`<div class="title"><small>INVENTAIRES</small><h1>Accès indisponible</h1><p>${esc(error.message)}</p></div>`,'home()')}
}

async function startInventoryForHolder(holderId){
  try{
    if(!confirm('Ouvrir un inventaire sur ce site ? Les mouvements de stock seront temporairement suspendus jusqu’à la clôture ou l’annulation.'))return inventoryHome();
    const id=await request('/rest/v1/rpc/ouvrir_inventaire_stock',{method:'POST',auth:true,body:{p_operation_client_id:crypto.randomUUID(),p_detenteur_stock_id:holderId,p_commentaire:null}});
    activeInventoryId=id;await inventoryDetail(id);
  }catch(error){alert(error.message);inventoryHome()}
}

async function startInventory(){
  try{
    const holder=await inventoryHolder();
    const existing=await request('/rest/v1/rpc/consulter_inventaires_stock',{method:'POST',auth:true,body:{p_detenteur_stock_id:holder.detenteur_stock_id}});
    const open=existing.find(x=>x.statut==='OUVERT');
    if(open)return inventoryDetail(open.inventaire_id);
    if(!confirm('Ouvrir un inventaire ? Les mouvements de stock de ce site seront temporairement suspendus jusqu’à sa clôture ou son annulation.'))return inventoryHome();
    const id=await request('/rest/v1/rpc/ouvrir_inventaire_stock',{method:'POST',auth:true,body:{p_operation_client_id:crypto.randomUUID(),p_detenteur_stock_id:holder.detenteur_stock_id,p_commentaire:null}});
    activeInventoryId=id;
    await inventoryDetail(id);
  }catch(error){alert(error.message);inventoryHome()}
}

async function inventoryDetail(id){
  try{
    const rows=await request('/rest/v1/rpc/consulter_lignes_inventaire_stock',{method:'POST',auth:true,body:{p_inventaire_id:id}});
    const globalPatron=currentContext().kind==='GLOBAL'&&hasRoleHere('PATRON');
    const holder=globalPatron?null:await inventoryHolder();
    const headers=await request('/rest/v1/rpc/consulter_inventaires_stock',{method:'POST',auth:true,body:{p_detenteur_stock_id:globalPatron?null:holder.detenteur_stock_id}});
    const meta=headers.find(x=>x.inventaire_id===id);
    if(!meta)throw new Error('Inventaire introuvable ou non autorisé.');
    activeInventoryId=id;activeInventoryRows=rows;
    const editable=meta.statut==='OUVERT';
    shell(`<div class="title"><small>${esc(meta.code_inventaire)} · ${esc(inventoryStatusLabel(meta.statut))}</small><h1>Comptage physique</h1><p>${rows.length} références · ${meta.lignes_comptees} déjà comptées</p></div>${editable?'<div class="notice">Les mouvements de stock de ce site restent suspendus jusqu’à la clôture ou l’annulation de cet inventaire.</div>':''}<div class="search">⌕ <input id="inventory-search" placeholder="Rechercher un SKU ou un produit…" oninput="filterInventoryRows(this.value)"></div><section id="inventory-lines" class="list">${inventoryLineMarkup(rows,editable)}</section>${editable?'<button class="primary secondary" onclick="saveInventoryCounts(false)">Enregistrer les comptages</button><button class="primary" onclick="saveInventoryCounts(true)">Enregistrer et clôturer</button><button class="text-button danger-link" onclick="cancelInventory()">Annuler cet inventaire</button>':'<button class="primary secondary" onclick="inventoryHome()">Retour aux inventaires</button>'}${nav('inventory')}`, 'inventoryHome()');
  }catch(error){shell(`<div class="title"><h1>Inventaire indisponible</h1><p>${esc(error.message)}</p></div>`,'inventoryHome()')}
}

function inventoryLineMarkup(rows,editable){
  return rows.map(row=>`<article class="product-row inventory-line" data-search="${esc(normText([row.sku_interne,row.marque_nom,row.produit_nom,row.reference_libelle].join(' ')))}"><div class="grow"><small>${esc(row.sku_interne)} · ${esc(row.marque_nom)}</small><strong>${esc(row.produit_nom)}</strong><span>${esc(row.reference_libelle)} · Théorique : ${row.quantite_theorique}</span>${row.ecart!==null&&row.ecart!==undefined?`<small>Écart : ${row.ecart>0?'+':''}${row.ecart}</small>`:''}</div><label class="inventory-count-field">Compté<input class="inventory-count" data-reference="${row.reference_produit_id}" type="number" min="0" step="1" inputmode="numeric" value="${row.quantite_comptee??''}" placeholder="—" ${editable?'':'disabled'}></label></article>`).join('');
}
function filterInventoryRows(query){const words=normText(query).split(' ').filter(Boolean);document.querySelectorAll('.inventory-line').forEach(row=>{const hay=row.dataset.search||'';row.hidden=!words.every(word=>hay.includes(word))})}

async function saveInventoryCounts(closeAfter){
  const inputs=[...document.querySelectorAll('.inventory-count')],lines=[];
  for(const input of inputs){
    if(input.value==='')continue;
    const quantity=Number(input.value);
    if(!Number.isInteger(quantity)||quantity<0){alert('Chaque quantité comptée doit être un entier positif ou zéro.');return}
    lines.push({reference_produit_id:input.dataset.reference,quantite_comptee:quantity,commentaire:null});
  }
  if(closeAfter&&lines.length!==inputs.length){alert('Comptez toutes les références avant de clôturer l’inventaire.');return}
  if(!lines.length){alert('Saisissez au moins un comptage.');return}
  try{
    await request('/rest/v1/rpc/saisir_comptages_inventaire_stock',{method:'POST',auth:true,body:{p_inventaire_id:activeInventoryId,p_lignes:lines}});
    if(closeAfter){
      await request('/rest/v1/rpc/cloturer_inventaire_stock',{method:'POST',auth:true,body:{p_inventaire_id:activeInventoryId,p_commentaire:null}});
      alert('Inventaire clôturé. Les écarts ont été enregistrés comme mouvements correctifs.');
      return inventoryHome();
    }
    alert(lines.length+' comptage(s) enregistré(s).');
    inventoryDetail(activeInventoryId);
  }catch(error){alert(error.message)}
}
async function cancelInventory(){
  const reason=prompt('Motif obligatoire de l’annulation :');
  if(!reason?.trim())return;
  try{await request('/rest/v1/rpc/annuler_inventaire_stock',{method:'POST',auth:true,body:{p_inventaire_id:activeInventoryId,p_motif:reason.trim()}});alert('Inventaire annulé. Les mouvements du site sont de nouveau autorisés.');inventoryHome()}
  catch(error){alert(error.message)}
}
