-- Le catalogue est déjà public en lecture. Cette politique explicite permet
-- aux sessions authentifiées de lire les mêmes lignes ; les écritures restent
-- exclusivement réalisées par les RPC Administrateur contrôlées côté serveur.
do $block$
declare
  v_table text;
begin
  foreach v_table in array array['marques','categories_produits','types_produit','produits','references_produit','conditionnements_reference']
  loop
    execute format('drop policy if exists catalogue_authenticated_select on public.%I',v_table);
    execute format('create policy catalogue_authenticated_select on public.%I for select to authenticated using (true)',v_table);
  end loop;
end
$block$;
