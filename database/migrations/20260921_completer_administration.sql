-- Fonctions complémentaires de l'administration DEV. Toutes les mutations
-- revérifient le rôle Administrateur global et sont fermées au rôle anonyme.

create or replace function public.est_administrateur_global_courant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(private.is_global_admin(private.current_business_user_id()), false)
$function$;

create or replace function public.admin_configurer_produit(
  p_produit_id uuid,
  p_nom_produit text,
  p_variante text,
  p_marque_id uuid,
  p_categorie_produit_id uuid,
  p_type_produit_id uuid,
  p_actif boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := private.current_business_user_id();
  v_name text := nullif(btrim(p_nom_produit), '');
  v_variant text := nullif(btrim(p_variante), '');
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  if v_name is null then raise exception 'Nom du produit obligatoire'; end if;
  if not exists(select 1 from public.marques where marque_id=p_marque_id and actif) then raise exception 'Marque active obligatoire'; end if;
  if not exists(select 1 from public.categories_produits where categorie_produit_id=p_categorie_produit_id and actif) then raise exception 'Catégorie active obligatoire'; end if;
  if not exists(select 1 from public.types_produit where type_produit_id=p_type_produit_id and actif) then raise exception 'Type actif obligatoire'; end if;
  if exists(select 1 from public.produits where produit_id<>p_produit_id and marque_id=p_marque_id and lower(btrim(nom_produit))=lower(v_name) and lower(coalesce(btrim(variante),''))=lower(coalesce(v_variant,''))) then raise exception 'Ce produit et cette variante existent déjà'; end if;

  update public.produits set nom_produit=v_name,variante=v_variant,marque_id=p_marque_id,categorie_produit_id=p_categorie_produit_id,type_produit_id=p_type_produit_id,actif=coalesce(p_actif,true) where produit_id=p_produit_id;
  if not found then raise exception 'Produit introuvable'; end if;
  if not coalesce(p_actif,true) then update public.references_produit set actif=false where produit_id=p_produit_id and actif; end if;
  update public.references_produit set libelle_reference=v_name||case when v_variant is null then '' else ' · '||v_variant end||' · '||trim(to_char(contenance_valeur,'FM999999990.##'))||' '||unite_contenance where produit_id=p_produit_id;
  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details) values(v_actor,'PRODUIT_CONFIGURE','PRODUIT',p_produit_id,jsonb_build_object('actif',coalesce(p_actif,true)));
  return p_produit_id;
end
$function$;

create or replace function public.admin_ajouter_reference_produit(
  p_produit_id uuid,
  p_sku_interne text,
  p_code_externe text,
  p_type_code_externe text,
  p_contenance_valeur numeric,
  p_unite_contenance text,
  p_quantite_dans_lot integer,
  p_carton_multiplicateur integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := private.current_business_user_id();
  v_product public.produits%rowtype;
  v_id uuid;
  v_sku text := upper(nullif(btrim(p_sku_interne),''));
  v_code text := nullif(btrim(p_code_externe),'');
  v_code_type text := upper(nullif(btrim(p_type_code_externe),''));
  v_unit text := upper(nullif(btrim(p_unite_contenance),''));
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  select * into v_product from public.produits where produit_id=p_produit_id;
  if not found then raise exception 'Produit introuvable'; end if;
  if v_sku is null or exists(select 1 from public.references_produit where lower(sku_interne)=lower(v_sku)) then raise exception 'SKU absent ou déjà utilisé'; end if;
  if p_contenance_valeur<=0 or v_unit not in ('ML','L','G','KG') or coalesce(p_quantite_dans_lot,0)<1 then raise exception 'Conditionnement invalide'; end if;
  if (v_code is null)<>(v_code_type is null) then raise exception 'Code-barres incomplet'; end if;
  if p_carton_multiplicateur is not null and p_carton_multiplicateur<2 then raise exception 'Un carton contient au moins 2 unités'; end if;
  insert into public.references_produit(produit_id,sku_interne,code_externe,type_code_externe,contenance_valeur,unite_contenance,quantite_dans_lot,libelle_reference,actif)
  values(p_produit_id,v_sku,v_code,v_code_type,p_contenance_valeur,v_unit,p_quantite_dans_lot,v_product.nom_produit||case when v_product.variante is null then '' else ' · '||v_product.variante end||' · '||trim(to_char(p_contenance_valeur,'FM999999990.##'))||' '||v_unit,true) returning reference_produit_id into v_id;
  insert into public.conditionnements_reference(reference_produit_id,nom_conditionnement,multiplicateur,est_unite_base,actif) values(v_id,'Unité',1,true,true);
  if p_carton_multiplicateur is not null then insert into public.conditionnements_reference(reference_produit_id,nom_conditionnement,multiplicateur,est_unite_base,actif) values(v_id,'Carton',p_carton_multiplicateur,false,true); end if;
  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details) values(v_actor,'REFERENCE_PRODUIT_CREE','REFERENCE_PRODUIT',v_id,jsonb_build_object('produit_id',p_produit_id,'sku',v_sku));
  return v_id;
end
$function$;

create or replace function public.admin_configurer_reference_produit(
  p_reference_produit_id uuid,
  p_code_externe text,
  p_type_code_externe text,
  p_contenance_valeur numeric,
  p_unite_contenance text,
  p_quantite_dans_lot integer,
  p_carton_multiplicateur integer,
  p_actif boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := private.current_business_user_id();
  v_ref public.references_produit%rowtype;
  v_product public.produits%rowtype;
  v_code text := nullif(btrim(p_code_externe),'');
  v_code_type text := upper(nullif(btrim(p_type_code_externe),''));
  v_unit text := upper(nullif(btrim(p_unite_contenance),''));
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  select * into v_ref from public.references_produit where reference_produit_id=p_reference_produit_id;
  if not found then raise exception 'Référence introuvable'; end if;
  select * into v_product from public.produits where produit_id=v_ref.produit_id;
  if p_contenance_valeur<=0 or v_unit not in ('ML','L','G','KG') or coalesce(p_quantite_dans_lot,0)<1 then raise exception 'Conditionnement invalide'; end if;
  if (v_code is null)<>(v_code_type is null) then raise exception 'Code-barres incomplet'; end if;
  if p_carton_multiplicateur is not null and p_carton_multiplicateur<2 then raise exception 'Un carton contient au moins 2 unités'; end if;
  update public.references_produit set code_externe=v_code,type_code_externe=v_code_type,contenance_valeur=p_contenance_valeur,unite_contenance=v_unit,quantite_dans_lot=p_quantite_dans_lot,libelle_reference=v_product.nom_produit||case when v_product.variante is null then '' else ' · '||v_product.variante end||' · '||trim(to_char(p_contenance_valeur,'FM999999990.##'))||' '||v_unit,actif=coalesce(p_actif,true) where reference_produit_id=p_reference_produit_id;
  update public.conditionnements_reference set multiplicateur=p_carton_multiplicateur,actif=p_carton_multiplicateur is not null where reference_produit_id=p_reference_produit_id and not est_unite_base;
  if p_carton_multiplicateur is not null and not exists(select 1 from public.conditionnements_reference where reference_produit_id=p_reference_produit_id and not est_unite_base) then insert into public.conditionnements_reference(reference_produit_id,nom_conditionnement,multiplicateur,est_unite_base,actif) values(p_reference_produit_id,'Carton',p_carton_multiplicateur,false,true); end if;
  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details) values(v_actor,'REFERENCE_PRODUIT_CONFIGUREE','REFERENCE_PRODUIT',p_reference_produit_id,jsonb_build_object('actif',coalesce(p_actif,true)));
  return p_reference_produit_id;
end
$function$;

create or replace function public.admin_configurer_nomenclature_produit(p_type text,p_id uuid,p_nom text,p_actif boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid:=private.current_business_user_id();v_id uuid:=p_id;v_name text:=nullif(btrim(p_nom),'');v_type text:=upper(btrim(p_type));
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  if v_name is null or v_type not in ('MARQUE','CATEGORIE','TYPE') then raise exception 'Données invalides'; end if;
  if v_type='MARQUE' then
    if v_id is null then insert into public.marques(nom_marque,actif) values(v_name,coalesce(p_actif,true)) returning marque_id into v_id; else update public.marques set nom_marque=v_name,actif=coalesce(p_actif,true) where marque_id=v_id; end if;
  elsif v_type='CATEGORIE' then
    if v_id is null then insert into public.categories_produits(nom_categorie,actif) values(v_name,coalesce(p_actif,true)) returning categorie_produit_id into v_id; else update public.categories_produits set nom_categorie=v_name,actif=coalesce(p_actif,true) where categorie_produit_id=v_id; end if;
  else
    if v_id is null then insert into public.types_produit(nom_type,actif) values(v_name,coalesce(p_actif,true)) returning type_produit_id into v_id; else update public.types_produit set nom_type=v_name,actif=coalesce(p_actif,true) where type_produit_id=v_id; end if;
  end if;
  insert into public.journal_administration(acteur_user_id,action_code,objet_type,objet_id,details) values(v_actor,'NOMENCLATURE_PRODUIT_CONFIGUREE',v_type,v_id,jsonb_build_object('actif',coalesce(p_actif,true)));
  return v_id;
end
$function$;

revoke all on function public.est_administrateur_global_courant() from public,anon;
revoke all on function public.admin_configurer_produit(uuid,text,text,uuid,uuid,uuid,boolean) from public,anon;
revoke all on function public.admin_ajouter_reference_produit(uuid,text,text,text,numeric,text,integer,integer) from public,anon;
revoke all on function public.admin_configurer_reference_produit(uuid,text,text,numeric,text,integer,integer,boolean) from public,anon;
revoke all on function public.admin_configurer_nomenclature_produit(text,uuid,text,boolean) from public,anon;
grant execute on function public.est_administrateur_global_courant() to authenticated;
grant execute on function public.admin_configurer_produit(uuid,text,text,uuid,uuid,uuid,boolean) to authenticated;
grant execute on function public.admin_ajouter_reference_produit(uuid,text,text,text,numeric,text,integer,integer) to authenticated;
grant execute on function public.admin_configurer_reference_produit(uuid,text,text,numeric,text,integer,integer,boolean) to authenticated;
grant execute on function public.admin_configurer_nomenclature_produit(text,uuid,text,boolean) to authenticated;
notify pgrst, 'reload schema';
