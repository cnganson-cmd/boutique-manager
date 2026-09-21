-- Fabricants, fournisseurs et file de validation des produits collectés auprès
-- de sources externes. La validation métier reste une action Administrateur.

create table if not exists public.fabricants (
  fabricant_id uuid primary key default gen_random_uuid(),
  nom_fabricant text not null,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  constraint fabricants_nom_non_vide check (btrim(nom_fabricant) <> '')
);
create unique index if not exists fabricants_nom_unique on public.fabricants (lower(btrim(nom_fabricant)));

create table if not exists public.fournisseurs (
  fournisseur_id uuid primary key default gen_random_uuid(),
  nom_fournisseur text not null,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  constraint fournisseurs_nom_non_vide check (btrim(nom_fournisseur) <> '')
);
create unique index if not exists fournisseurs_nom_unique on public.fournisseurs (lower(btrim(nom_fournisseur)));

alter table public.produits add column if not exists fabricant_id uuid references public.fabricants(fabricant_id) on delete set null;
create index if not exists produits_fabricant_idx on public.produits(fabricant_id);

create table if not exists public.produits_fournisseurs (
  produit_id uuid not null references public.produits(produit_id) on delete cascade,
  fournisseur_id uuid not null references public.fournisseurs(fournisseur_id) on delete restrict,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  primary key(produit_id, fournisseur_id)
);
create index if not exists produits_fournisseurs_fournisseur_idx on public.produits_fournisseurs(fournisseur_id);

create table if not exists public.candidats_import_catalogue (
  candidat_import_id uuid primary key default gen_random_uuid(),
  source_code text not null,
  source_url text not null,
  marque text not null,
  nom_produit text not null,
  variante text,
  categorie_suggeree text,
  type_suggere text,
  contenance_valeur numeric,
  unite_contenance text,
  fabricant text,
  fournisseur text,
  statut text not null default 'A_VALIDER' check (statut in ('A_VALIDER','IMPORTE','IGNORE')),
  produit_id uuid references public.produits(produit_id) on delete set null,
  collecte_le timestamptz not null default now(),
  valide_le timestamptz,
  constraint candidat_source_unique unique(source_code, source_url, contenance_valeur, unite_contenance),
  constraint candidat_contenance_valide check (contenance_valeur is null or contenance_valeur > 0),
  constraint candidat_unite_valide check (unite_contenance is null or unite_contenance in ('ML','L','G','KG'))
);
create index if not exists candidats_import_statut_idx on public.candidats_import_catalogue(statut, collecte_le desc);
create index if not exists candidats_import_produit_idx on public.candidats_import_catalogue(produit_id);

alter table public.fabricants enable row level security;
alter table public.fournisseurs enable row level security;
alter table public.produits_fournisseurs enable row level security;
alter table public.candidats_import_catalogue enable row level security;

drop policy if exists catalogue_read_fabricants on public.fabricants;
create policy catalogue_read_fabricants on public.fabricants for select to anon using (actif);
drop policy if exists admin_read_all_fabricants on public.fabricants;
create policy admin_read_all_fabricants on public.fabricants for select to authenticated using (actif or public.est_administrateur_global_courant());
drop policy if exists admin_read_fournisseurs on public.fournisseurs;
create policy admin_read_fournisseurs on public.fournisseurs for select to authenticated using (public.est_administrateur_global_courant());
drop policy if exists admin_read_produits_fournisseurs on public.produits_fournisseurs;
create policy admin_read_produits_fournisseurs on public.produits_fournisseurs for select to authenticated using (public.est_administrateur_global_courant());
drop policy if exists admin_read_candidats_import on public.candidats_import_catalogue;
create policy admin_read_candidats_import on public.candidats_import_catalogue for select to authenticated using (public.est_administrateur_global_courant());

grant select on public.fabricants to anon, authenticated;
grant select on public.fournisseurs, public.produits_fournisseurs, public.candidats_import_catalogue to authenticated;
revoke insert, update, delete on public.fabricants, public.fournisseurs, public.produits_fournisseurs, public.candidats_import_catalogue from anon, authenticated;

create or replace function public.admin_configurer_partenaire_catalogue(p_type text, p_id uuid, p_nom text, p_actif boolean)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_actor uuid:=private.current_business_user_id();v_id uuid:=p_id;v_nom text:=nullif(btrim(p_nom),'');v_type text:=upper(btrim(p_type));
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  if v_nom is null or v_type not in ('FABRICANT','FOURNISSEUR') then raise exception 'Données invalides'; end if;
  if v_type='FABRICANT' then
    if exists(select 1 from public.fabricants where fabricant_id<>coalesce(v_id,gen_random_uuid()) and lower(btrim(nom_fabricant))=lower(v_nom)) then raise exception 'Ce fabricant existe déjà'; end if;
    if v_id is null then insert into public.fabricants(nom_fabricant,actif) values(v_nom,coalesce(p_actif,true)) returning fabricant_id into v_id;
    else update public.fabricants set nom_fabricant=v_nom,actif=coalesce(p_actif,true),modifie_le=now() where fabricant_id=v_id; if not found then raise exception 'Fabricant introuvable'; end if; end if;
  else
    if exists(select 1 from public.fournisseurs where fournisseur_id<>coalesce(v_id,gen_random_uuid()) and lower(btrim(nom_fournisseur))=lower(v_nom)) then raise exception 'Ce fournisseur existe déjà'; end if;
    if v_id is null then insert into public.fournisseurs(nom_fournisseur,actif) values(v_nom,coalesce(p_actif,true)) returning fournisseur_id into v_id;
    else update public.fournisseurs set nom_fournisseur=v_nom,actif=coalesce(p_actif,true),modifie_le=now() where fournisseur_id=v_id; if not found then raise exception 'Fournisseur introuvable'; end if; end if;
  end if;
  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details) values(v_actor,'PARTENAIRE_CATALOGUE_CONFIGURE',v_type,v_id,jsonb_build_object('nom',v_nom,'actif',coalesce(p_actif,true)));
  return v_id;
end $function$;

create or replace function public.admin_associer_approvisionnement_produit(p_produit_id uuid,p_fabricant_id uuid,p_fournisseur_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_actor uuid:=private.current_business_user_id();v_fournisseur_id uuid;
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  if not exists(select 1 from public.produits where produit_id=p_produit_id) then raise exception 'Produit introuvable'; end if;
  if p_fabricant_id is not null and not exists(select 1 from public.fabricants where fabricant_id=p_fabricant_id and actif) then raise exception 'Fabricant actif obligatoire'; end if;
  update public.produits set fabricant_id=p_fabricant_id where produit_id=p_produit_id;
  delete from public.produits_fournisseurs where produit_id=p_produit_id;
  foreach v_fournisseur_id in array coalesce(p_fournisseur_ids,array[]::uuid[]) loop
    if not exists(select 1 from public.fournisseurs where fournisseur_id=v_fournisseur_id and actif) then raise exception 'Fournisseur actif obligatoire'; end if;
    insert into public.produits_fournisseurs(produit_id,fournisseur_id) values(p_produit_id,v_fournisseur_id) on conflict do nothing;
  end loop;
  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details) values(v_actor,'APPROVISIONNEMENT_PRODUIT_CONFIGURE','PRODUIT',p_produit_id,jsonb_build_object('fabricant_id',p_fabricant_id,'fournisseur_ids',coalesce(to_jsonb(p_fournisseur_ids),'[]'::jsonb)));
  return p_produit_id;
end $function$;

create or replace function public.admin_marquer_candidat_import(p_candidat_import_id uuid,p_statut text,p_produit_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_actor uuid:=private.current_business_user_id();v_statut text:=upper(btrim(p_statut));
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  if v_statut not in ('A_VALIDER','IMPORTE','IGNORE') then raise exception 'Statut invalide'; end if;
  if v_statut='IMPORTE' and (p_produit_id is null or not exists(select 1 from public.produits where produit_id=p_produit_id)) then raise exception 'Produit importé obligatoire'; end if;
  update public.candidats_import_catalogue set statut=v_statut,produit_id=case when v_statut='IMPORTE' then p_produit_id else null end,valide_le=case when v_statut='A_VALIDER' then null else now() end where candidat_import_id=p_candidat_import_id;
  if not found then raise exception 'Candidat introuvable'; end if;
  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details) values(v_actor,'CANDIDAT_IMPORT_TRAITE','CANDIDAT_IMPORT_CATALOGUE',p_candidat_import_id,jsonb_build_object('statut',v_statut,'produit_id',p_produit_id));
  return p_candidat_import_id;
end $function$;

create or replace function public.admin_creer_produit_avec_approvisionnement(
  p_nom_marque text,p_nom_produit text,p_variante text,p_categorie_produit_id uuid,p_type_produit_id uuid,
  p_sku_interne text,p_code_externe text,p_type_code_externe text,p_contenance_valeur numeric,p_unite_contenance text,
  p_quantite_dans_lot integer,p_carton_multiplicateur integer,p_fabricant_id uuid,p_fournisseur_ids uuid[],p_candidat_import_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_actor uuid:=private.current_business_user_id();v_produit_id uuid;
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  v_produit_id:=public.admin_creer_produit_complet(p_nom_marque,p_nom_produit,p_variante,p_categorie_produit_id,p_type_produit_id,p_sku_interne,p_code_externe,p_type_code_externe,p_contenance_valeur,p_unite_contenance,p_quantite_dans_lot,p_carton_multiplicateur);
  perform public.admin_associer_approvisionnement_produit(v_produit_id,p_fabricant_id,p_fournisseur_ids);
  if p_candidat_import_id is not null then perform public.admin_marquer_candidat_import(p_candidat_import_id,'IMPORTE',v_produit_id); end if;
  return v_produit_id;
end $function$;

revoke all on function public.admin_configurer_partenaire_catalogue(text,uuid,text,boolean) from public,anon;
revoke all on function public.admin_associer_approvisionnement_produit(uuid,uuid,uuid[]) from public,anon;
revoke all on function public.admin_marquer_candidat_import(uuid,text,uuid) from public,anon;
revoke all on function public.admin_creer_produit_avec_approvisionnement(text,text,text,uuid,uuid,text,text,text,numeric,text,integer,integer,uuid,uuid[],uuid) from public,anon;
grant execute on function public.admin_configurer_partenaire_catalogue(text,uuid,text,boolean) to authenticated;
grant execute on function public.admin_associer_approvisionnement_produit(uuid,uuid,uuid[]) to authenticated;
grant execute on function public.admin_marquer_candidat_import(uuid,text,uuid) to authenticated;
grant execute on function public.admin_creer_produit_avec_approvisionnement(text,text,text,uuid,uuid,text,text,text,numeric,text,integer,integer,uuid,uuid[],uuid) to authenticated;

insert into public.fabricants(nom_fabricant) values('Lana Bio Cosmetics') on conflict do nothing;
insert into public.fournisseurs(nom_fournisseur) values('Lana Bio Cosmetics') on conflict do nothing;

insert into public.candidats_import_catalogue(source_code,source_url,marque,nom_produit,variante,categorie_suggeree,type_suggere,contenance_valeur,unite_contenance,fabricant,fournisseur) values
('LANA_SITE','https://lana-biocosmetics.com/en/clarifyingrange/caro-care/caro_careclarifying_cream_300g__1326','Caro Care','Crème clarifiante',null,'Soins du corps','Crème',300,'G','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/hydratingrange/caroderma/hydrating_lotion_500ml_%26_1000ml_1047','Caroderma','Lotion hydratante',null,'Soins du corps','Lotion',500,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/hydratingrange/caroderma/hydrating_lotion_500ml_%26_1000ml_1047','Caroderma','Lotion hydratante',null,'Soins du corps','Lotion',1000,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/hydratingrange/every-body/every_body_hydrating_lotion__coconut_500_%26_900ml_1353','Every Body','Lotion hydratante','Coco','Soins du corps','Lotion',500,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/hydratingrange/every-body/every_body_hydrating_lotion__coconut_500_%26_900ml_1353','Every Body','Lotion hydratante','Coco','Soins du corps','Lotion',900,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://www.lana-biocosmetics.com/en/hydratingrange/hydrat-1000/glycerin_hydrating_lotion_500_%26_1000ml_784','Hydrat 1000','Lotion hydratante','Glycérine','Soins du corps','Lotion',500,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://www.lana-biocosmetics.com/en/hydratingrange/hydrat-1000/glycerin_hydrating_lotion_500_%26_1000ml_784','Hydrat 1000','Lotion hydratante','Glycérine','Soins du corps','Lotion',1000,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/clarifyingrange/white-now/white_now_clarifying_oil_125ml_1041','White Now','Huile clarifiante',null,'Soins du corps','Lotion',125,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/clarifyingrange/white-now/white_now_shower_gel_clarifying_and_exfoliating_shower_1l_750','White Now','Gel douche clarifiant et exfoliant',null,'Hygiène','Gel lavant',1,'L','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/clarifyingrange/teint-jaune/teint_jaune_clarifying_oil_125ml_1044','Teint Jaune','Huile clarifiante',null,'Soins du corps','Lotion',125,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/clarifyingrange/teint-jaune/teint_jaune_clarifying_and_exfoliating_shower_1000ml_735','Teint Jaune','Gel douche clarifiant et exfoliant',null,'Hygiène','Gel lavant',1000,'ML','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://lana-biocosmetics.com/en/clarifyingrange/super-white/super_white_clarifying_cream_300g_1334','Super White','Crème clarifiante',null,'Soins du corps','Crème',300,'G','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://www.lana-biocosmetics.com/en/personalcareproducts/lanaderm/lanaderm_exfoliating_soap_with_apricot_kernels_230g_1137','Lanaderm','Savon exfoliant','Noyaux d’abricot','Hygiène','Savon',230,'G','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://www.lana-biocosmetics.com/en/personalcareproducts/american-hair-care/creme_relaxer_regular_150_g_-_300g_665','American Hair Care','Crème défrisante','Regular','Soins du corps','Crème',150,'G','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://www.lana-biocosmetics.com/en/personalcareproducts/american-hair-care/creme_relaxer_regular_150_g_-_300g_665','American Hair Care','Crème défrisante','Regular','Soins du corps','Crème',300,'G','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://www.lana-biocosmetics.com/en/personalcareproducts/american-hair-care/creme_relaxer_super_150_g_-_300g_899','American Hair Care','Crème défrisante','Super','Soins du corps','Crème',150,'G','Lana Bio Cosmetics','Lana Bio Cosmetics'),
('LANA_SITE','https://www.lana-biocosmetics.com/en/personalcareproducts/american-hair-care/creme_relaxer_super_150_g_-_300g_899','American Hair Care','Crème défrisante','Super','Soins du corps','Crème',300,'G','Lana Bio Cosmetics','Lana Bio Cosmetics')
on conflict(source_code,source_url,contenance_valeur,unite_contenance) do nothing;

notify pgrst, 'reload schema';
