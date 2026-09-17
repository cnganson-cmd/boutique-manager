const WRONG_SITE_TEST_LINE='0827b9b7-53ea-42df-8bea-6b2f4c8f5ce9';
async function testWrongSiteSecurity(){
  const output=document.querySelector('#security-test-result');
  if(output)output.innerHTML='<p>Test en cours…</p>';
  try{
    await request('/rest/v1/rpc/traiter_ligne_demande_stock',{method:'POST',auth:true,body:{p_ligne_flux_stock_id:WRONG_SITE_TEST_LINE,p_decision:'VALIDE',p_quantite:1,p_commentaire:'Test sécurité mauvais site'}});
    if(output)output.innerHTML='<p><strong>❌ ÉCHEC SÉCURITÉ :</strong> Supabase a laissé Yakin traiter une demande dont la source est le Dépôt Marché Central.</p>';
  }catch(err){
    const msg=String(err.message||'');
    const denied=/Action non autorisée pour ce site/i.test(msg);
    if(output)output.innerHTML=denied
      ?`<p><strong>✅ TEST RÉUSSI :</strong> Supabase a refusé à Yakin le traitement de la demande du Dépôt Marché Central.</p><small>${esc(msg)}</small>`
      :`<p><strong>⚠️ TEST NON CONCLUANT :</strong> l'appel a échoué, mais pas avec le refus de site attendu.</p><small>${esc(msg)}</small>`;
  }
}
function wrongSiteSecurityScreen(){
  if(!currentUser)return false;
  shell(`<div class="title"><small>TEST DE SÉCURITÉ</small><h1>Mauvais site → refus</h1><p>La demande appartient au Dépôt Marché Central. Yakin est magasinier uniquement à l’Atelier Montée Jouvence. Supabase doit refuser avant toute écriture.</p></div><div id="security-test-result" class="empty">Compte testé : <strong>${esc(currentUser.nom)}</strong></div><button class="primary" onclick="testWrongSiteSecurity()">Tester le refus du site</button>`,'home()');
  return true;
}
function openWrongSiteSecurityTest(){
  if(location.hash!=='#security-test-wrong-site')return;
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(wrongSiteSecurityScreen()||attempts>=40)clearInterval(timer)},250);
}
window.addEventListener('hashchange',openWrongSiteSecurityTest);
openWrongSiteSecurityTest();
