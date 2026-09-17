async function testDirectDmlSecurity(){
 const o=document.querySelector('#direct-dml-result'); if(o)o.innerHTML='<p>Test en cours…</p>';
 try{
  await request('/rest/v1/stocks_courants?stock_courant_id=eq.519cf597-41d5-47c0-9502-057ec3e233fa',{method:'PATCH',auth:true,body:{quantite:987654321}});
  if(o)o.innerHTML='<p><strong>❌ ÉCHEC SÉCURITÉ :</strong> Supabase a accepté la tentative de modification directe. Ne pas poursuivre : vérification DB requise.</p>';
 }catch(e){
  if(o)o.innerHTML=`<p><strong>✅ TEST RÉUSSI :</strong> Supabase a refusé la modification directe de stocks_courants.</p><small>${esc(String(e.message||e))}</small>`;
 }
}
function directDmlSecurityScreen(){if(!currentUser)return false;shell(`<div class="title"><small>TEST DE SÉCURITÉ</small><h1>Écriture directe DML → refus</h1><p>La session authentifiée de ${esc(currentUser.nom)} tente de modifier directement une ligne réelle de stocks_courants, sans passer par une RPC métier.</p></div><div id="direct-dml-result" class="empty">Aucune écriture n'a encore été tentée.</div><button class="primary" onclick="testDirectDmlSecurity()">Tester l'écriture directe</button>`,'home()');return true;}
function openDirectDmlSecurityTest(){if(location.hash!=='#security-test-direct-dml')return;let n=0;const t=setInterval(()=>{n++;if(directDmlSecurityScreen()||n>=40)clearInterval(t)},250)}
window.addEventListener('hashchange',openDirectDmlSecurityTest);openDirectDmlSecurityTest();
