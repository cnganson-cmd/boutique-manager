const YAKIN_TEST_DEPOT_SITE='60d90b92-028c-46de-838b-2c5a648e74b4';
async function testYakinDepotOperationalSecurity(){
  const output=document.querySelector('#security-test-result');
  if(output)output.innerHTML='<p>Test en cours…</p>';
  try{
    const allowed=await request('/rest/v1/rpc/test_permission_stock_temp',{method:'POST',auth:true,body:{p_code_action:'EXPEDIER_STOCK',p_site_id:YAKIN_TEST_DEPOT_SITE}});
    if(allowed===false){
      if(output)output.innerHTML='<p><strong>✅ TEST RÉUSSI :</strong> avec la vraie session de Yakin, Supabase confirme qu’il ne peut pas expédier le stock du Dépôt Marché Central.</p><small>EXPEDIER_STOCK au Dépôt = refusé</small>';
    }else{
      if(output)output.innerHTML='<p><strong>❌ ÉCHEC SÉCURITÉ :</strong> Supabase considère Yakin autorisé à expédier depuis le Dépôt Marché Central.</p>';
    }
  }catch(err){
    if(output)output.innerHTML=`<p><strong>⚠️ TEST NON CONCLUANT :</strong> impossible d’obtenir la décision d’autorisation.</p><small>${esc(String(err.message||''))}</small>`;
  }
}
function yakinSecurityTestScreen(){
  if(!currentUser)return false;
  shell(`<div class="title"><small>TEST DE SÉCURITÉ</small><h1>Administrateur ≠ Magasinier global</h1><p>Ce test demande uniquement au moteur d’autorisation si la session de Yakin peut expédier depuis le Dépôt Marché Central. Il est en lecture seule : aucun flux et aucun stock ne sont modifiés.</p></div><div id="security-test-result" class="empty">Compte testé : <strong>${esc(currentUser.nom)}</strong></div><button class="primary" onclick="testYakinDepotOperationalSecurity()">Tester la permission</button>`,'home()');
  return true;
}
function openYakinSecurityTest(){
  if(location.hash!=='#security-test-yakin')return;
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(yakinSecurityTestScreen()||attempts>=40)clearInterval(timer)},250);
}
window.addEventListener('hashchange',openYakinSecurityTest);
openYakinSecurityTest();
