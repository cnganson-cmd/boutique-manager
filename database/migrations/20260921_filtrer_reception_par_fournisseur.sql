-- Le filtrage fournisseur est contrôlé par PostgreSQL et non seulement par l'UI.
create or replace function private.verifier_reference_arrivage_fournisseur()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare v_fournisseur uuid;
begin
  select a.fournisseur_id into v_fournisseur
  from public.arrivages_fournisseur a
  where a.arrivage_fournisseur_id=new.arrivage_fournisseur_id;

  if v_fournisseur is null then raise exception 'Arrivage fournisseur introuvable'; end if;
  if not exists(
    select 1
    from public.references_produit r
    join public.produits_fournisseurs pf on pf.produit_id=r.produit_id
    where r.reference_produit_id=new.reference_produit_id
      and r.actif and pf.fournisseur_id=v_fournisseur and pf.actif
  ) then
    raise exception 'Cette référence n''est pas rattachée au fournisseur sélectionné';
  end if;
  return new;
end
$function$;

drop trigger if exists verifier_reference_arrivage_fournisseur on public.lignes_arrivage_fournisseur;
create trigger verifier_reference_arrivage_fournisseur
before insert or update of arrivage_fournisseur_id,reference_produit_id
on public.lignes_arrivage_fournisseur
for each row execute function private.verifier_reference_arrivage_fournisseur();

create or replace function public.consulter_references_fournisseur_reception(p_site_id uuid,p_fournisseur_id uuid)
returns table(
  reference_produit_id uuid,sku_interne text,photo_url text,libelle_reference text,
  produit_id uuid,produit_nom text,variante text,marque_nom text
)
language plpgsql stable security definer set search_path=''
as $function$
begin
  if (select auth.uid()) is null or private.current_business_user_id() is null then raise exception 'Authentification requise'; end if;
  if p_site_id is null or not private.can('RECEPTIONNER_STOCK',p_site_id) then raise exception 'Réception fournisseur non autorisée sur ce site'; end if;
  if not exists(select 1 from public.fournisseurs f where f.fournisseur_id=p_fournisseur_id and f.actif) then raise exception 'Fournisseur actif introuvable'; end if;

  return query
  select r.reference_produit_id,r.sku_interne,r.photo_url,r.libelle_reference,
    p.produit_id,p.nom_produit,p.variante,m.nom_marque
  from public.produits_fournisseurs pf
  join public.produits p on p.produit_id=pf.produit_id and p.actif
  join public.marques m on m.marque_id=p.marque_id and m.actif
  join public.references_produit r on r.produit_id=p.produit_id and r.actif
  where pf.fournisseur_id=p_fournisseur_id and pf.actif
  order by m.nom_marque,p.nom_produit,r.libelle_reference;
end
$function$;

revoke all on function public.consulter_references_fournisseur_reception(uuid,uuid) from public,anon;
grant execute on function public.consulter_references_fournisseur_reception(uuid,uuid) to authenticated;
