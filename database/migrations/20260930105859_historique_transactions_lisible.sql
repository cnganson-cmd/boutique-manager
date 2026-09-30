-- Les tables événementielles conservent déjà acteur et horodatage. Ces RPC
-- exposent un historique lisible sans ouvrir l'annuaire complet des employés.
create or replace function public.consulter_historique_flux_stock(p_flux_stock_id uuid)
returns table(action_code text,acteur_nom text,acteur_user_id uuid,details text,cree_le timestamptz)
language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid;
begin
  v_actor:=private.current_business_user_id();
  if v_actor is null or not private.can_view_flux(p_flux_stock_id) then raise exception 'Flux non autorisé'; end if;
  return query
  select x.action_code,coalesce(u.prenom,u.nom,'Système'),x.acteur_user_id,x.details,x.cree_le
  from (
    select 'CREATION'::text,f.demandeur_user_id,('Flux créé avec le statut '||f.statut)::text,f.cree_le
    from public.flux_stock f where f.flux_stock_id=p_flux_stock_id
    union all
    select e.type_evenement,e.acteur_user_id,concat_ws(' · ',case when e.quantite is not null then 'Quantité '||e.quantite end,case when e.decision is not null then 'Décision '||e.decision end,nullif(e.commentaire,''))::text,e.cree_le
    from public.evenements_lignes_flux_stock e join public.lignes_flux_stock l on l.ligne_flux_stock_id=e.ligne_flux_stock_id
    where l.flux_stock_id=p_flux_stock_id
  ) x(action_code,acteur_user_id,details,cree_le)
  left join public.utilisateurs u on u.user_id=x.acteur_user_id order by x.cree_le;
end $function$;

create or replace function public.consulter_historique_flux_argent(p_flux_argent_id uuid)
returns table(action_code text,acteur_nom text,acteur_user_id uuid,details text,cree_le timestamptz)
language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid;v_src uuid;v_dst uuid;
begin
  v_actor:=private.current_business_user_id();
  select coalesce(f.detenteur_source_id,(select h.detenteur_stock_id from public.detenteurs_stock h where h.site_id=f.site_source_id limit 1)),coalesce(f.detenteur_destination_id,(select h.detenteur_stock_id from public.detenteurs_stock h where h.site_id=f.site_destination_id limit 1))
  into v_src,v_dst from public.flux_argent f where f.flux_argent_id=p_flux_argent_id;
  if not found or v_actor is null or not (private.is_global_patron(v_actor) or private.money_holder_actor(v_actor,v_src) or (v_dst is not null and private.money_holder_actor(v_actor,v_dst))) then raise exception 'Flux non autorisé'; end if;
  return query
  select x.action_code,coalesce(u.prenom,u.nom,'Système'),x.acteur_user_id,x.details,x.cree_le
  from (
    select 'CREATION'::text,f.initiateur_user_id,('Opération créée avec le statut '||f.statut)::text,f.cree_le
    from public.flux_argent f where f.flux_argent_id=p_flux_argent_id
    union all
    select e.type_evenement,e.acteur_user_id,concat_ws(' · ','Cash '||coalesce(e.montant_cash,0),'Mobile Money '||coalesce(e.montant_mobile_money,0),nullif(e.commentaire,''))::text,e.cree_le
    from public.evenements_flux_argent e where e.flux_argent_id=p_flux_argent_id
  ) x(action_code,acteur_user_id,details,cree_le)
  left join public.utilisateurs u on u.user_id=x.acteur_user_id order by x.cree_le;
end $function$;

revoke all on function public.consulter_historique_flux_stock(uuid) from public,anon;
revoke all on function public.consulter_historique_flux_argent(uuid) from public,anon;
grant execute on function public.consulter_historique_flux_stock(uuid) to authenticated;
grant execute on function public.consulter_historique_flux_argent(uuid) to authenticated;
