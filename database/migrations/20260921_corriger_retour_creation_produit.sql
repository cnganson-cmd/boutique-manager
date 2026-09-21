-- Corrige l'adaptateur catalogue : admin_creer_produit_complet renvoie un objet JSONB
-- contenant plusieurs identifiants, et non directement l'UUID du produit.
create or replace function public.admin_creer_produit_avec_approvisionnement(
  p_nom_marque text,p_nom_produit text,p_variante text,p_categorie_produit_id uuid,p_type_produit_id uuid,
  p_sku_interne text,p_code_externe text,p_type_code_externe text,p_contenance_valeur numeric,p_unite_contenance text,
  p_quantite_dans_lot integer,p_carton_multiplicateur integer,p_fabricant_id uuid,p_fournisseur_ids uuid[],p_candidat_import_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $function$
declare v_actor uuid:=private.current_business_user_id();v_creation jsonb;v_produit_id uuid;
begin
  if v_actor is null or not private.is_global_admin(v_actor) then raise exception 'Administration non autorisée'; end if;
  v_creation:=public.admin_creer_produit_complet(p_nom_marque,p_nom_produit,p_variante,p_categorie_produit_id,p_type_produit_id,p_sku_interne,p_code_externe,p_type_code_externe,p_contenance_valeur,p_unite_contenance,p_quantite_dans_lot,p_carton_multiplicateur);
  v_produit_id:=nullif(v_creation->>'produit_id','')::uuid;
  if v_produit_id is null then raise exception 'La création du produit n’a retourné aucun identifiant'; end if;
  perform public.admin_associer_approvisionnement_produit(v_produit_id,p_fabricant_id,p_fournisseur_ids);
  if p_candidat_import_id is not null then perform public.admin_marquer_candidat_import(p_candidat_import_id,'IMPORTE',v_produit_id); end if;
  return v_produit_id;
end $function$;

revoke all on function public.admin_creer_produit_avec_approvisionnement(text,text,text,uuid,uuid,text,text,text,numeric,text,integer,integer,uuid,uuid[],uuid) from public,anon;
grant execute on function public.admin_creer_produit_avec_approvisionnement(text,text,text,uuid,uuid,text,text,text,numeric,text,integer,integer,uuid,uuid[],uuid) to authenticated;

notify pgrst, 'reload schema';
