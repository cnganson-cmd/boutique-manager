async function testAdminRouteSecurity(){
  const output=document.querySelector('#security-test-result');
  if(output)output.innerHTML='<p>Test en cours…</p>';
  try{
    await request('/rest/v1/rpc/configurer_route_flux_stock',{
      method:'POST',auth:true,
      body:{
        p_type_flux_stock_id:REAPPRO_TYPE,
        p_detenteur_source_id:DEPOT_HOLDER,
        p_detenteur_destination_id:BOUTIQUE104_HOLDER,
        p_actif:true
      }
    });
    if(output)output.innerHTML='<p><strong>❌ ÉCHEC SÉCURITÉ :</strong> le serveur a accepté la configuration.</p>';
  }catch(err){
    if(output)output.innerHTML=`<p><strong>✅ TEST RÉUSSI :</strong> Supabase a refusé la configuration.</p><small>${esc(err.message)}</small>`;
  }
}
function securityTestScreen(){
  if(!currentUser){loginScreen();return}
  shell(`<div class="title"><small>TEST DE SÉCURITÉ</small><h1>Permission Administrateur</h1><p>Ce test tente de conserver active la route Dépôt Marché Central → Boutique 104. Il ne touche pas au stock.</p></div><div id="security-test-result" class="empty">Compte testé : <strong>${esc(currentUser.nom)}</strong></div><button class="primary" onclick="testAdminRouteSecurity()">Tester le refus serveur</button>`,'home()');
}
function openSecurityTestFromHash(){if(location.hash==='#security-test'&&currentUser)securityTestScreen()}
window.addEventListener('hashchange',openSecurityTestFromHash);
setTimeout(openSecurityTestFromHash,250);
