-- Réception fournisseur : double numérotation, mise en stock atomique et audit.
create sequence if not exists public.numero_arrivage_fournisseur_seq;

create table if not exists public.arrivages_fournisseur (
  arrivage_fournisseur_id uuid primary key default gen_random_uuid(),
  numero_interne text not null unique,
  operation_client_id uuid not null unique,
  site_id uuid not null references public.sites(site_id),
  detenteur_stock_id uuid not null references public.detenteurs_stock(detenteur_stock_id),
  fournisseur_id uuid not null references public.fournisseurs(fournisseur_id),
  numero_bon_fournisseur text not null,
  date_livraison date not null,
  statut text not null default 'VALIDE' check (statut in ('VALIDE')),
  commentaire text,
  cree_par_user_id uuid not null references public.utilisateurs(user_id),
  cree_le timestamptz not null default now(),
  constraint arrivages_numero_bon_non_vide check (btrim(numero_bon_fournisseur) <> '')
);

create unique index if not exists arrivages_fournisseur_bon_unique
  on public.arrivages_fournisseur(fournisseur_id, lower(btrim(numero_bon_fournisseur)));
create index if not exists arrivages_fournisseur_site_date_idx
  on public.arrivages_fournisseur(site_id, date_livraison desc, cree_le desc);
create index if not exists arrivages_fournisseur_detenteur_idx on public.arrivages_fournisseur(detenteur_stock_id);
create index if not exists arrivages_fournisseur_acteur_idx on public.arrivages_fournisseur(cree_par_user_id);

create table if not exists public.lignes_arrivage_fournisseur (
  ligne_arrivage_fournisseur_id uuid primary key default gen_random_uuid(),
  arrivage_fournisseur_id uuid not null references public.arrivages_fournisseur(arrivage_fournisseur_id) on delete cascade,
  reference_produit_id uuid not null references public.references_produit(reference_produit_id),
  quantite_attendue integer,
  quantite_recue integer not null,
  quantite_abimee integer not null default 0,
  quantite_entree integer generated always as (quantite_recue - quantite_abimee) stored,
  commentaire text,
  unique(arrivage_fournisseur_id, reference_produit_id),
  check (quantite_attendue is null or quantite_attendue >= 0),
  check (quantite_recue > 0),
  check (quantite_abimee >= 0 and quantite_abimee <= quantite_recue)
);
create index if not exists lignes_arrivage_reference_idx on public.lignes_arrivage_fournisseur(reference_produit_id);

alter table public.mouvements_stock
  add column if not exists arrivage_fournisseur_id uuid references public.arrivages_fournisseur(arrivage_fournisseur_id),
  add column if not exists ligne_arrivage_fournisseur_id uuid references public.lignes_arrivage_fournisseur(ligne_arrivage_fournisseur_id);
create index if not exists mouvements_stock_arrivage_idx
  on public.mouvements_stock(arrivage_fournisseur_id);
create index if not exists mouvements_stock_ligne_arrivage_idx
  on public.mouvements_stock(ligne_arrivage_fournisseur_id);
alter table public.mouvements_stock drop constraint if exists mouvements_stock_type_mouvement_check;
alter table public.mouvements_stock add constraint mouvements_stock_type_mouvement_check
  check (type_mouvement in ('STOCK_INITIAL','EXPEDITION','RECEPTION','RETOUR','CORRECTION_INVENTAIRE','ENTREE_FOURNISSEUR'));

alter table public.arrivages_fournisseur enable row level security;
alter table public.lignes_arrivage_fournisseur enable row level security;
revoke all on public.arrivages_fournisseur, public.lignes_arrivage_fournisseur from anon, authenticated;
revoke all on sequence public.numero_arrivage_fournisseur_seq from anon, authenticated;

create or replace function public.enregistrer_arrivage_fournisseur(
  p_operation_client_id uuid,
  p_site_id uuid,
  p_fournisseur_id uuid,
  p_numero_bon_fournisseur text,
  p_date_livraison date,
  p_commentaire text,
  p_lignes jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;
  v_holder uuid;
  v_arrival uuid;
  v_internal text;
  v_supplier_name text;
  v_line_id uuid;
  v_line record;
  v_total_received integer := 0;
  v_total_damaged integer := 0;
  v_total_stocked integer := 0;
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if p_operation_client_id is null then raise exception 'Identifiant opération obligatoire'; end if;
  v_actor := private.current_business_user_id();
  if v_actor is null then raise exception 'Utilisateur métier actif introuvable'; end if;

  select jsonb_build_object(
    'arrivage_fournisseur_id', a.arrivage_fournisseur_id,
    'numero_interne', a.numero_interne,
    'numero_bon_fournisseur', a.numero_bon_fournisseur,
    'statut', a.statut
  ) into v_result
  from public.arrivages_fournisseur a
  where a.operation_client_id = p_operation_client_id;
  if v_result is not null then return v_result; end if;

  if p_site_id is null or not private.can('RECEPTIONNER_STOCK', p_site_id) then
    raise exception 'Réception fournisseur non autorisée sur ce site';
  end if;
  select d.detenteur_stock_id into v_holder
  from public.detenteurs_stock d
  where d.site_id=p_site_id and d.type_detenteur='SITE' and d.actif
  limit 1;
  if v_holder is null then raise exception 'Détenteur de stock actif introuvable pour ce site'; end if;

  select f.nom_fournisseur into v_supplier_name
  from public.fournisseurs f where f.fournisseur_id=p_fournisseur_id and f.actif;
  if v_supplier_name is null then raise exception 'Fournisseur actif introuvable'; end if;
  if nullif(btrim(p_numero_bon_fournisseur),'') is null then raise exception 'Numéro du bon fournisseur obligatoire'; end if;
  if length(btrim(p_numero_bon_fournisseur)) > 100 then raise exception 'Numéro du bon fournisseur trop long'; end if;
  if p_date_livraison is null or p_date_livraison > current_date then raise exception 'Date de livraison invalide'; end if;
  if p_lignes is null or jsonb_typeof(p_lignes)<>'array' or jsonb_array_length(p_lignes)=0 then
    raise exception 'Au moins une référence reçue est obligatoire';
  end if;
  if jsonb_array_length(p_lignes)>200 then raise exception 'Un arrivage ne peut pas dépasser 200 références'; end if;
  if (select count(*) from (select x.reference_produit_id from jsonb_to_recordset(p_lignes) x(reference_produit_id uuid) group by x.reference_produit_id having count(*)>1) d)>0 then
    raise exception 'Une référence est présente plusieurs fois';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fournisseur_id::text||':'||lower(btrim(p_numero_bon_fournisseur)),0));
  if exists(select 1 from public.arrivages_fournisseur a where a.fournisseur_id=p_fournisseur_id and lower(btrim(a.numero_bon_fournisseur))=lower(btrim(p_numero_bon_fournisseur))) then
    raise exception 'Ce bon de livraison fournisseur a déjà été enregistré';
  end if;

  v_internal := 'ARR-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.numero_arrivage_fournisseur_seq')::text,6,'0');
  insert into public.arrivages_fournisseur(
    numero_interne,operation_client_id,site_id,detenteur_stock_id,fournisseur_id,
    numero_bon_fournisseur,date_livraison,commentaire,cree_par_user_id
  ) values(
    v_internal,p_operation_client_id,p_site_id,v_holder,p_fournisseur_id,
    btrim(p_numero_bon_fournisseur),p_date_livraison,nullif(btrim(p_commentaire),''),v_actor
  ) returning arrivage_fournisseur_id into v_arrival;

  for v_line in
    select x.reference_produit_id,x.quantite_attendue,x.quantite_recue,coalesce(x.quantite_abimee,0) quantite_abimee,nullif(btrim(x.commentaire),'') commentaire
    from jsonb_to_recordset(p_lignes) x(reference_produit_id uuid,quantite_attendue integer,quantite_recue integer,quantite_abimee integer,commentaire text)
  loop
    if not exists(select 1 from public.references_produit r where r.reference_produit_id=v_line.reference_produit_id and r.actif) then
      raise exception 'Référence produit active introuvable';
    end if;
    if v_line.quantite_recue is null or v_line.quantite_recue<=0 then raise exception 'La quantité reçue doit être positive'; end if;
    if v_line.quantite_attendue is not null and v_line.quantite_attendue<0 then raise exception 'La quantité attendue ne peut pas être négative'; end if;
    if v_line.quantite_abimee<0 or v_line.quantite_abimee>v_line.quantite_recue then raise exception 'La quantité abîmée est invalide'; end if;

    insert into public.lignes_arrivage_fournisseur(arrivage_fournisseur_id,reference_produit_id,quantite_attendue,quantite_recue,quantite_abimee,commentaire)
    values(v_arrival,v_line.reference_produit_id,v_line.quantite_attendue,v_line.quantite_recue,v_line.quantite_abimee,v_line.commentaire)
    returning ligne_arrivage_fournisseur_id into v_line_id;

    if v_line.quantite_recue-v_line.quantite_abimee>0 then
      insert into public.stocks_courants(detenteur_stock_id,reference_produit_id,quantite,mis_a_jour_le)
      values(v_holder,v_line.reference_produit_id,v_line.quantite_recue-v_line.quantite_abimee,now())
      on conflict(detenteur_stock_id,reference_produit_id) do update
      set quantite=public.stocks_courants.quantite+excluded.quantite,mis_a_jour_le=now();

      insert into public.mouvements_stock(
        detenteur_stock_id,reference_produit_id,type_mouvement,variation_quantite,acteur_user_id,commentaire,
        arrivage_fournisseur_id,ligne_arrivage_fournisseur_id
      ) values(
        v_holder,v_line.reference_produit_id,'ENTREE_FOURNISSEUR',v_line.quantite_recue-v_line.quantite_abimee,v_actor,
        'Arrivage '||v_internal||' · BL fournisseur '||btrim(p_numero_bon_fournisseur),v_arrival,v_line_id
      );
    end if;
    v_total_received := v_total_received+v_line.quantite_recue;
    v_total_damaged := v_total_damaged+v_line.quantite_abimee;
    v_total_stocked := v_total_stocked+(v_line.quantite_recue-v_line.quantite_abimee);
  end loop;

  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details)
  values(v_actor,'ARRIVAGE_FOURNISSEUR_VALIDE','ARRIVAGE_FOURNISSEUR',v_arrival,jsonb_build_object(
    'numero_interne',v_internal,'numero_bon_fournisseur',btrim(p_numero_bon_fournisseur),
    'fournisseur_id',p_fournisseur_id,'fournisseur',v_supplier_name,'site_id',p_site_id,
    'date_livraison',p_date_livraison,'nombre_references',jsonb_array_length(p_lignes),
    'quantite_recue',v_total_received,'quantite_abimee',v_total_damaged,'quantite_entree_stock',v_total_stocked,
    'operation_client_id',p_operation_client_id
  ));

  return jsonb_build_object(
    'arrivage_fournisseur_id',v_arrival,'numero_interne',v_internal,
    'numero_bon_fournisseur',btrim(p_numero_bon_fournisseur),'statut','VALIDE',
    'quantite_recue',v_total_received,'quantite_abimee',v_total_damaged,'quantite_entree_stock',v_total_stocked
  );
end
$function$;

create or replace function public.consulter_arrivages_fournisseur(p_site_id uuid default null,p_limite integer default 100)
returns table(
  arrivage_fournisseur_id uuid,numero_interne text,numero_bon_fournisseur text,date_livraison date,statut text,
  site_id uuid,site_nom text,fournisseur_id uuid,fournisseur_nom text,acteur_nom text,
  nombre_references bigint,quantite_recue bigint,quantite_abimee bigint,quantite_entree_stock bigint,cree_le timestamptz
)
language plpgsql stable security definer set search_path=''
as $function$
declare v_limite integer:=greatest(1,least(coalesce(p_limite,100),500));
begin
  if (select auth.uid()) is null or private.current_business_user_id() is null then raise exception 'Authentification requise'; end if;
  if p_site_id is not null and not private.can('RECEPTIONNER_STOCK',p_site_id) then raise exception 'Consultation non autorisée sur ce site'; end if;
  return query
  select a.arrivage_fournisseur_id,a.numero_interne,a.numero_bon_fournisseur,a.date_livraison,a.statut,
    a.site_id,s.nom_site,a.fournisseur_id,f.nom_fournisseur,coalesce(u.prenom,u.nom),
    count(l.ligne_arrivage_fournisseur_id),coalesce(sum(l.quantite_recue),0),coalesce(sum(l.quantite_abimee),0),coalesce(sum(l.quantite_entree),0),a.cree_le
  from public.arrivages_fournisseur a
  join public.sites s on s.site_id=a.site_id
  join public.fournisseurs f on f.fournisseur_id=a.fournisseur_id
  join public.utilisateurs u on u.user_id=a.cree_par_user_id
  join public.lignes_arrivage_fournisseur l on l.arrivage_fournisseur_id=a.arrivage_fournisseur_id
  where private.can('RECEPTIONNER_STOCK',a.site_id) and (p_site_id is null or a.site_id=p_site_id)
  group by a.arrivage_fournisseur_id,s.nom_site,f.nom_fournisseur,u.prenom,u.nom
  order by a.cree_le desc limit v_limite;
end
$function$;

create or replace function public.consulter_lignes_arrivage_fournisseur(p_arrivage_fournisseur_id uuid)
returns table(
  ligne_arrivage_fournisseur_id uuid,reference_produit_id uuid,sku_interne text,photo_url text,
  marque_nom text,produit_nom text,reference_libelle text,quantite_attendue integer,
  quantite_recue integer,quantite_abimee integer,quantite_entree integer,commentaire text
)
language plpgsql stable security definer set search_path=''
as $function$
declare v_site uuid;
begin
  if (select auth.uid()) is null or private.current_business_user_id() is null then raise exception 'Authentification requise'; end if;
  select a.site_id into v_site from public.arrivages_fournisseur a where a.arrivage_fournisseur_id=p_arrivage_fournisseur_id;
  if v_site is null then raise exception 'Arrivage introuvable'; end if;
  if not private.can('RECEPTIONNER_STOCK',v_site) then raise exception 'Consultation non autorisée'; end if;
  return query select l.ligne_arrivage_fournisseur_id,l.reference_produit_id,r.sku_interne,r.photo_url,
    m.nom_marque,p.nom_produit,r.libelle_reference,l.quantite_attendue,l.quantite_recue,l.quantite_abimee,l.quantite_entree,l.commentaire
  from public.lignes_arrivage_fournisseur l
  join public.references_produit r on r.reference_produit_id=l.reference_produit_id
  join public.produits p on p.produit_id=r.produit_id
  join public.marques m on m.marque_id=p.marque_id
  where l.arrivage_fournisseur_id=p_arrivage_fournisseur_id
  order by m.nom_marque,p.nom_produit,r.libelle_reference;
end
$function$;

create or replace function public.consulter_fournisseurs_reception(p_site_id uuid)
returns table(fournisseur_id uuid,nom_fournisseur text)
language plpgsql stable security definer set search_path=''
as $function$
begin
  if (select auth.uid()) is null or private.current_business_user_id() is null then raise exception 'Authentification requise'; end if;
  if p_site_id is null or not private.can('RECEPTIONNER_STOCK',p_site_id) then raise exception 'Réception fournisseur non autorisée sur ce site'; end if;
  return query select f.fournisseur_id,f.nom_fournisseur from public.fournisseurs f where f.actif order by f.nom_fournisseur;
end
$function$;

revoke all on function public.enregistrer_arrivage_fournisseur(uuid,uuid,uuid,text,date,text,jsonb) from public,anon;
revoke all on function public.consulter_arrivages_fournisseur(uuid,integer) from public,anon;
revoke all on function public.consulter_lignes_arrivage_fournisseur(uuid) from public,anon;
revoke all on function public.consulter_fournisseurs_reception(uuid) from public,anon;
grant execute on function public.enregistrer_arrivage_fournisseur(uuid,uuid,uuid,text,date,text,jsonb) to authenticated;
grant execute on function public.consulter_arrivages_fournisseur(uuid,integer) to authenticated;
grant execute on function public.consulter_lignes_arrivage_fournisseur(uuid) to authenticated;
grant execute on function public.consulter_fournisseurs_reception(uuid) to authenticated;
