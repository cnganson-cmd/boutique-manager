const app=document.querySelector('#app');
const SUPABASE_URL='https://cvaysurwzkphmsvqujab.supabase.co';
const SUPABASE_KEY='sb_publishable_EvO6xjIFQH74h-p7hXLQ-Q_oEmvcWCo';
let cart=[];
let products=[];
let catalogReady=false;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(table,select='*'){
 const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`,{headers:{apikey:SUPABASE_KEY}});
 if(!r.ok) throw new Error(`${table}: ${r.status}`);
 return r.json();
}
async function loadCatalog(){
 try{
  const [brands,categories,prods,refs]=await Promise.all([
   api('marques','marque_id,nom_marque,actif'),api('categories_produits','categorie_produit_id,nom_categorie,actif'),
   api('produits','produit_id,nom_produit,variante,marque_id,categorie_produit_id,actif'),
   api('references_produit','reference_produit_id,produit_id,libelle_reference,actif')]);
  const bm=Object.fromEntries(brands.filter(x=>x.actif).map(x=>[x.marque_id,x.nom_marque]));
  const cm=Object.fromEntries(categories.filter(x=>x.actif).map(x=>[x.categorie_produit_id,x.nom_categorie]));
  products=prods.filter(x=>x.actif&&bm[x.marque_id]).map(p=>({id:p.produit_id,name:p.nom_produit,variant:p.variante||'',brand:bm[p.marque_id],category:cm[p.categorie_produit_id]||'Autres',emoji:'🧴',refs:refs.filter(r=>r.actif&&r.produit_id===p.produit_id).map(r=>({id:r.reference_produit_id,label:r.libelle_reference}))})).filter(p=>p.refs.length).sort((a,b)=>(a.brand+' '+a.name).localeCompare(b.brand+' '+b.name,'fr'));
  catalogReady=true;
 }catch(e){console.error(e);catalogReady=false;}
}
function shell(content,back=''){app.innerHTML=`<header>${back?`<button class="back" onclick="${back}">←</button>`:'<div><small>BOUTIQUE MANAGER</small><h1>Bonjour Georges 👋</h1><p>Boutique 104 · Marché Central</p></div><button class="avatar">G</button>'}</header>${content}`}
function home(){shell(`<section class="hero"><span>Stock de ma boutique</span><strong>Inventaire à renseigner</strong><button>Voir le stock →</button></section><h2>Que voulez-vous faire ?</h2><section class="grid"><button class="card" onclick="startRequest()"><b>＋</b><span>Demander du stock</span><small>Créer une demande au dépôt</small></button><button class="card"><b>🚚</b><span>Réceptions</span><small>Contrôler les arrivages</small></button><button class="card" onclick="catalog()"><b>📦</b><span>Catalogue</span><small>Produits et catégories</small></button><button class="card"><b>↔</b><span>Flux stock</span><small>Suivre les mouvements</small></button></section>${nav()}`)}
function nav(){return `<nav><button class="active" onclick="home()">⌂<span>Accueil</span></button><button>▣<span>Stock</span></button><button>↔<span>Flux</span></button><button>◉<span>Profil</span></button></nav>`}
async function startRequest(){shell(`<div class="title"><small>NOUVELLE DEMANDE</small><h1>Chargement du catalogue…</h1><p>Lecture depuis Supabase.</p></div>`,'home()');if(!catalogReady)await loadCatalog();if(!catalogReady){shell(`<div class="title"><small>NOUVELLE DEMANDE</small><h1>Catalogue indisponible</h1><p>Aucune donnée n'a été modifiée.</p></div><button class="primary" onclick="startRequest()">Réessayer</button>`,'home()');return}renderRequest()}
function renderRequest(){const cats=[...new Set(products.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,'fr'));shell(`<div class="title"><small>NOUVELLE DEMANDE</small><h1>Choisir les produits</h1><p>${products.length} produits du catalogue Supabase · Destination : Boutique 104</p></div><div class="search">⌕ <input placeholder="Rechercher un produit…" oninput="filterProducts(this.value)"></div><div class="chips"><button class="selected" onclick="filterCategory('')">Tous</button>${cats.map((c,i)=>`<button onclick="filterCategoryByIndex(${i})">${esc(c)}</button>`).join('')}</div><section id="products" class="list">${productRows(products)}</section><button class="basket" onclick="review()">Voir la demande <span>${cart.length}</span></button>`,'home()')}
function catalog(){startRequest()}
function productRows(items){return items.map(p=>`<article class="product-row"><div class="photo">${p.emoji}</div><div class="grow"><small>${esc(p.brand)} · ${esc(p.category)}</small><strong>${esc(p.name)}</strong>${p.variant?`<span>${esc(p.variant)}</span>`:''}<span>${p.refs.length} référence${p.refs.length>1?'s':''}</span></div><button onclick="choose('${p.id}')">＋</button></article>`).join('')||'<div class="empty">Aucun produit trouvé.</div>'}
function filterProducts(q){document.querySelector('#products').innerHTML=productRows(products.filter(p=>(p.brand+' '+p.name+' '+p.variant+' '+p.category).toLowerCase().includes(q.toLowerCase())))}
function filterCategory(c){document.querySelector('#products').innerHTML=productRows(c?products.filter(p=>p.category===c):products)}
function filterCategoryByIndex(i){const cats=[...new Set(products.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,'fr'));filterCategory(cats[i])}
function choose(id){const p=products.find(x=>x.id===id);shell(`<div class="title"><small>${esc(p.brand)}</small><h1>${esc(p.name)}</h1><p>${esc(p.variant||p.category)}</p></div><div class="big-photo">${p.emoji}</div><label>Référence</label><select id="ref">${p.refs.map(r=>`<option value="${r.id}">${esc(r.label)}</option>`).join('')}</select><label>Quantité demandée</label><div class="qty"><button onclick="qty(-1)">−</button><strong id="qty">1</strong><button onclick="qty(1)">＋</button></div><button class="primary" onclick="add('${id}')">Ajouter à la demande</button>`,'renderRequest()')}
function qty(n){const e=document.querySelector('#qty');e.textContent=Math.max(1,+e.textContent+n)}
function add(id){const p=products.find(x=>x.id===id),sel=document.querySelector('#ref'),r=p.refs.find(x=>x.id===sel.value);cart.push({referenceId:r.id,brand:p.brand,name:p.name,ref:r.label,qty:+document.querySelector('#qty').textContent});renderRequest()}
function review(){shell(`<div class="title"><small>RÉCAPITULATIF</small><h1>Ma demande</h1><p>Source : Dépôt Marché Central</p></div>${cart.length?`<section class="list">${cart.map((x,i)=>`<article class="product-row"><div class="grow"><small>${esc(x.brand)}</small><strong>${esc(x.name)}</strong><span>${esc(x.ref)} · Quantité ${x.qty}</span></div><button onclick="removeItem(${i})">×</button></article>`).join('')}</section><button class="primary" onclick="sent()">Envoyer la demande</button>`:`<div class="empty">Votre demande est vide.</div><button class="primary" onclick="renderRequest()">Ajouter des produits</button>`}`,'renderRequest()')}
function removeItem(i){cart.splice(i,1);review()}
function sent(){shell(`<div class="success"><div>✓</div><h1>Test terminé</h1><p>Le catalogue est réel. L'envoi vers les flux stock reste volontairement désactivé jusqu'à la sécurisation Auth/RLS.</p><button class="primary" onclick="home()">Retour à l'accueil</button></div>`)}
home();loadCatalog();