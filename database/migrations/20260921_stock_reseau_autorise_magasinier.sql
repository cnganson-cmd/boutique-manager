-- Lecture réseau du stock, filtrée ligne par ligne selon les sites attribués.
-- Un rôle global conserve sa vision globale ; un Magasinier ne reçoit que les
-- détenteurs pour lesquels CONSULTER_STOCK / CONSULTER_FLUX_STOCK est accordé.

create or replace function public.consulter_repartition_stock(p_recherche text default null)
returns table(
  detenteur_stock_id uuid,type_detenteur text,detenteur_nom text,
  reference_produit_id uuid,sku_interne text,photo_url text,
  marque_nom text,produit_nom text,variante text,reference_libelle text,
  quantite integer,mis_a_jour_le timestamptz
)
language plpgsql stable security definer set search_path='' as $function$
declare v_global boolean;v_recherche text:=nullif(btrim(p_recherche),'');
begin
  if (select auth.uid()) is null or private.current_business_user_id() is null then raise exception 'Authentification requise'; end if;
  v_global:=private.can('CONSULTER_STOCK',null);
  if not v_global and not exists(
    select 1 from public.detenteurs_stock d
    where d.actif and private.can_access_holder(d.detenteur_stock_id,'CONSULTER_STOCK')
  ) then raise exception 'Consultation du stock non autorisée'; end if;

  return query
  select d.detenteur_stock_id,d.type_detenteur,
    case when d.type_detenteur='DESTOCKEUR' then coalesce(u.prenom,u.nom,'Déstockeur')||' · mobile' else coalesce(s.nom_site,'Site sans nom') end,
    rp.reference_produit_id,rp.sku_interne,rp.photo_url,m.nom_marque,p.nom_produit,p.variante,rp.libelle_reference,
    sc.quantite::integer,sc.mis_a_jour_le
  from public.stocks_courants sc
  join public.detenteurs_stock d on d.detenteur_stock_id=sc.detenteur_stock_id and d.actif
  left join public.sites s on s.site_id=d.site_id
  left join public.utilisateurs u on u.user_id=d.destockeur_user_id
  join public.references_produit rp on rp.reference_produit_id=sc.reference_produit_id
  join public.produits p on p.produit_id=rp.produit_id
  join public.marques m on m.marque_id=p.marque_id
  where (v_global or private.can_access_holder(d.detenteur_stock_id,'CONSULTER_STOCK'))
    and (v_recherche is null or concat_ws(' ',rp.sku_interne,m.nom_marque,p.nom_produit,p.variante,rp.libelle_reference,
      case when d.type_detenteur='DESTOCKEUR' then coalesce(u.prenom,u.nom) else s.nom_site end) ilike '%'||v_recherche||'%')
  order by m.nom_marque,p.nom_produit,rp.libelle_reference,detenteur_nom;
end $function$;

create or replace function public.consulter_mouvements_stock_accessibles(p_detenteur_stock_id uuid default null,p_limite integer default 100)
returns table(
  mouvement_stock_id uuid,detenteur_stock_id uuid,detenteur_nom text,
  reference_produit_id uuid,sku_interne text,reference_libelle text,
  type_mouvement text,variation_quantite integer,commentaire text,cree_le timestamptz
)
language plpgsql stable security definer set search_path='' as $function$
declare v_global boolean;v_limite integer:=greatest(1,least(coalesce(p_limite,100),500));
begin
  if (select auth.uid()) is null or private.current_business_user_id() is null then raise exception 'Authentification requise'; end if;
  v_global:=private.can('CONSULTER_FLUX_STOCK',null);
  if p_detenteur_stock_id is not null and not v_global and not private.can_access_holder(p_detenteur_stock_id,'CONSULTER_FLUX_STOCK') then
    raise exception 'Mouvements de ce site non autorisés';
  end if;
  if p_detenteur_stock_id is null and not v_global and not exists(
    select 1 from public.detenteurs_stock d where d.actif and private.can_access_holder(d.detenteur_stock_id,'CONSULTER_FLUX_STOCK')
  ) then raise exception 'Consultation des mouvements non autorisée'; end if;

  return query
  select ms.mouvement_stock_id,d.detenteur_stock_id,
    case when d.type_detenteur='DESTOCKEUR' then coalesce(u.prenom,u.nom,'Déstockeur')||' · mobile' else coalesce(s.nom_site,'Site sans nom') end,
    rp.reference_produit_id,rp.sku_interne,rp.libelle_reference,ms.type_mouvement,ms.variation_quantite,ms.commentaire,ms.cree_le
  from public.mouvements_stock ms
  join public.detenteurs_stock d on d.detenteur_stock_id=ms.detenteur_stock_id and d.actif
  left join public.sites s on s.site_id=d.site_id
  left join public.utilisateurs u on u.user_id=d.destockeur_user_id
  join public.references_produit rp on rp.reference_produit_id=ms.reference_produit_id
  where (v_global or private.can_access_holder(d.detenteur_stock_id,'CONSULTER_FLUX_STOCK'))
    and (p_detenteur_stock_id is null or d.detenteur_stock_id=p_detenteur_stock_id)
  order by ms.cree_le desc limit v_limite;
end $function$;

revoke all on function public.consulter_repartition_stock(text) from public,anon;
revoke all on function public.consulter_mouvements_stock_accessibles(uuid,integer) from public,anon;
grant execute on function public.consulter_repartition_stock(text) to authenticated;
grant execute on function public.consulter_mouvements_stock_accessibles(uuid,integer) to authenticated;
notify pgrst,'reload schema';
