const YAKIN_TEST_FLOW='df23af03-b97e-44fe-8f5a-cfd2eb994423';
async function testYakinDepotOperationalSecurity(){
  const output=document.querySelector('#security-test-result');
  if(output)output.innerHTML='<p>Test en cours…</p>';
  try{
    await request('/rest/v1/rpc/expedier_demande_stock',{method:'POST',auth:true,body:{p_flux_stock_id:YAKIN_TEST_FLOW}});
    if(output)output.innerHTML='<p><strong>❌ ÉCHEC SÉCURITÉ :</strong> le serveur a accepté une action opérationnelle de Yakin au Dépôt Marché Central.</p>';
  }catch(err){
    const msg=String(err.message||'');
    const permission=/non autoris|autorisation|permission/i.test(msg);
    if(output)output.innerHTML=permission
      ?`<p><strong>✅ TEST RÉUSSI :</strong> Supabase a refusé à Yakin l’action opérationnelle au Dépôt Marché Central.</p><small>${esc(msg)}</small>`
      :`<p><strong>⚠️ TEST NON CONCLUANT :</strong> l’appel a été refusé, mais pour une autre raison que la permission.</p><small>${esc(msg)}</small>`;
  }
}
function yakinSecurityTestScreen(){
  if(!currentUser)return false;
  shell(`<div class="title"><small>TEST DE SÉCURITÉ</small><h1>Administrateur ≠ Magasinier global</h1><p>Ce test utilise un ancien flux déjà clôturé et tente une expédition au Dépôt Marché Central avec la session de Yakin. Aucun stock ne doit être modifié.</p></div><div id="security-test-result" class="empty">Compte testé : <strong>${esc(currentUser.nom)}</strong></div><button class="primary" onclick="testYakinDepotOperationalSecurity()">Tester le refus opérationnel</button>`,'home()');
  return true;
}
function openYakinSecurityTest(){
  if(location.hash!=='#security-test-yakin')return;
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(yakinSecurityTestScreen()||attempts>=40)clearInterval(timer)},250);
}
window.addEventListener('hashchange',openYakinSecurityTest);
openYakinSecurityTest();
