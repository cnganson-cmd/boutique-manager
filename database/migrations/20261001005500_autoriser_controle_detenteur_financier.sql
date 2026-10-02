-- Les politiques RLS des flux financiers exécutent ce prédicat pour chaque ligne.
-- La fonction reste dans le schéma privé et ne devient pas un RPC public ; seul
-- le rôle applicatif authentifié peut l'exécuter pendant l'évaluation des RLS.
revoke execute on function private.money_holder_actor(uuid, uuid) from public, anon;
grant execute on function private.money_holder_actor(uuid, uuid) to authenticated;
