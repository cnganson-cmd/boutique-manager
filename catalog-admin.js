// Gestion du catalogue réservée à l'Administrateur global. La création complète
// reste atomique et contrôlée par la RPC afin d'éviter les produits incomplets.
async function adminCatalog(message=''){
  if(!adminOnly())return adminError('Accès non autorisé','La gestion du catalogue est réservée à l’Administrateur global.');
  try{
    const [items,brands,refs]=await Promise.all([
      authApi('produits','produit_id,nom_produit,variante,marque_id,actif','&order=nom_produit.asc'),
      authApi('marques','marque_id,nom_marque'),
      authApi('references_produit','reference_produit_id,produit_id,sku_interne,libelle_reference,actif')
    ]),brandNames=Object.fromEntries(brands.map(x=>[x.marque_id,x.nom_marque]));
    shell(`<div class="title"><small>ADMINISTRATION · CATALOGUE</small><h1>Produits</h1><p>${items.length} produit${items.length>1?'s':''} · ${refs.filter(x=>x.actif).length} référence${refs.filter(x=>x.actif).length>1?'s':''} active${refs.filter(x=>x.actif).length>1?'s':''}.</p>${message?`<p><strong>${esc(message)}</strong></p>`:''}</div><button class="primary" onclick="adminNewProduct()">＋ Nouveau produit</button><section class="list">${items.map(p=>{const productRefs=refs.filter(r=>r.produit_id===p.produit_id);return `<article class="product-row"><div class="grow"><small>${esc(brandNames[p.marque_id]||'Sans marque')} · ${p.actif?'ACTIF':'INACTIF'}</small><strong>${esc(p.nom_produit)}</strong><span>${esc(p.variante||'Sans variante')} · ${productRefs.length} référence${productRefs.length>1?'s':''}</span></div></article>`}).join('')||'<div class="empty">Aucun produit.</div>'}</section>`,'adminConsole()');
  }catch(e){adminError('Catalogue indisponible',e)}
}

async function adminNewProduct(){
  if(!adminOnly())return;
  try{
    const [brands,categories,types]=await Promise.all([
      authApi('marques','marque_id,nom_marque,actif','&actif=eq.true&order=nom_marque.asc'),
      authApi('categories_produits','categorie_produit_id,nom_categorie,actif','&actif=eq.true&order=nom_categorie.asc'),
      authApi('types_produit','type_produit_id,nom_type,actif','&actif=eq.true&order=nom_type.asc')
    ]);
    shell(`<div class="title"><small>NOUVEAU PRODUIT</small><h1>Ajouter au catalogue</h1><p>Créez le produit, sa première référence et son conditionnement en une seule étape.</p></div><datalist id="brand-options">${brands.map(x=>`<option value="${esc(x.nom_marque)}"></option>`).join('')}</datalist><label for="cp-brand">Marque</label><input id="cp-brand" list="brand-options" maxlength="100" autocomplete="off" placeholder="Choisir ou saisir une nouvelle marque"><label for="cp-name">Nom du produit</label><input id="cp-name" maxlength="160" autocomplete="off" placeholder="Ex. Lait corps hydratant"><label for="cp-variant">Variante</label><input id="cp-variant" maxlength="160" autocomplete="off" placeholder="Ex. Karité · facultatif"><label for="cp-category">Catégorie</label><select id="cp-category"><option value="">Choisir une catégorie</option>${categories.map(x=>`<option value="${x.categorie_produit_id}">${esc(x.nom_categorie)}</option>`).join('')}</select><label for="cp-type">Type de produit</label><select id="cp-type"><option value="">Choisir un type</option>${types.map(x=>`<option value="${x.type_produit_id}">${esc(x.nom_type)}</option>`).join('')}</select><div class="form-section"><h2>Référence vendable</h2><div class="auto-value"><strong>SKU interne automatique</strong><span>Il sera généré à l’enregistrement, par exemple SAM-000001.</span></div><div class="form-pair"><div><label for="cp-size">Contenance</label><input id="cp-size" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="400"></div><div><label for="cp-unit">Unité</label><select id="cp-unit"><option value="ML">ml</option><option value="L">L</option><option value="G">g</option><option value="KG">kg</option></select></div></div><label for="cp-barcode">Code-barres</label><input id="cp-barcode" inputmode="numeric" maxlength="40" autocomplete="off" placeholder="Facultatif"><label for="cp-lot">Unités vendues ensemble</label><input id="cp-lot" type="number" inputmode="numeric" min="1" step="1" value="1"><label for="cp-carton">Unités par carton</label><input id="cp-carton" type="number" inputmode="numeric" min="2" step="1" placeholder="Facultatif, ex. 24"></div><button class="primary" id="cp-save" onclick="adminSaveProduct()">Créer le produit</button>`,'adminCatalog()');
  }catch(e){adminError('Formulaire indisponible',e,'adminCatalog()')}
}

async function adminSaveProduct(){
  const value=id=>document.getElementById(id)?.value?.trim()||'',brand=value('cp-brand'),name=value('cp-name'),category=value('cp-category'),type=value('cp-type'),size=Number(value('cp-size')),lot=Number(value('cp-lot')),cartonText=value('cp-carton'),carton=cartonText?Number(cartonText):null,barcode=value('cp-barcode');
  if(!brand||!name)return alert('Renseignez la marque et le nom du produit.');
  if(!category||!type)return alert('Choisissez une catégorie et un type de produit.');
  if(!Number.isFinite(size)||size<=0)return alert('Indiquez une contenance supérieure à zéro.');
  if(!Number.isInteger(lot)||lot<1)return alert('Le nombre d’unités vendues ensemble doit être un entier positif.');
  if(carton!==null&&(!Number.isInteger(carton)||carton<2))return alert('Un carton doit contenir au moins 2 unités.');
  const button=document.getElementById('cp-save');button.disabled=true;button.textContent='Création…';
  try{
    const sku=await request('/rest/v1/rpc/admin_generer_sku_produit',{method:'POST',auth:true,body:{}});
    await request('/rest/v1/rpc/admin_creer_produit_complet',{method:'POST',auth:true,body:{p_nom_marque:brand,p_nom_produit:name,p_variante:value('cp-variant')||null,p_categorie_produit_id:category,p_type_produit_id:type,p_sku_interne:sku,p_code_externe:barcode||null,p_type_code_externe:barcode?'EAN13':null,p_contenance_valeur:size,p_unite_contenance:value('cp-unit'),p_quantite_dans_lot:lot,p_carton_multiplicateur:carton}});
    products=[];catalogReady=false;packagingByRef={};void loadCatalog();
    shell(`<div class="success"><div>✓</div><h1>Produit créé</h1><p>${esc(brand)} · ${esc(name)} est maintenant disponible dans le catalogue.</p><p><strong>SKU : ${esc(sku)}</strong></p><button class="primary" onclick="adminCatalog()">Retour au catalogue</button></div>`);
  }catch(e){button.disabled=false;button.textContent='Créer le produit';alert(e.message)}
}
