async function testDisabledUserSecurity(){
 const o=document.querySelector('#disabled-test-result'); if(o)o.innerHTML='<p>Test en cours…</p>';
 try{const allowed=await request('/rest/v1/rpc/test_disabled_user_temp',{method:'POST',auth:true,body:{}}); if(o)o.innerHTML=allowed===false?'<p><strong>✅ TEST RÉUSSI :</strong> la session Auth existe encore, mais Supabase ne reconnaît plus Yakin comme utilisateur métier actif.</p>':'<p><strong>❌ ÉCHEC SÉCURITÉ :</strong> Yakin désactivé est encore reconnu comme utilisateur métier actif.</p>';}
 catch(e){if(o)o.innerHTML=`<p><strong>⚠️ TEST NON CONCLUANT</strong></p><small>${esc(String(e.message||e))}</small>`;}
}
function disabledUserSecurityScreen(){if(!currentUser)return false;shell(`<div class="title"><small>TEST DE SÉCURITÉ</small><h1>Utilisateur désactivé → refus</h1><p>Yakin est temporairement désactivé dans la base. Sa session Auth est volontairement conservée.</p></div><div id="disabled-test-result" class="empty">Session affichée : <strong>${esc(currentUser.nom)}</strong></div><button class="primary" onclick="testDisabledUserSecurity()">Tester la désactivation</button>`,'home()');return true;}
function openDisabledUserSecurityTest(){if(location.hash!=='#security-test-disabled-user')return;let n=0;const t=setInterval(()=>{n++;if(disabledUserSecurityScreen()||n>=40)clearInterval(t)},250)}
window.addEventListener('hashchange',openDisabledUserSecurityTest);openDisabledUserSecurityTest();
