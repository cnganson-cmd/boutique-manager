-- Photos des références produit. Le catalogue peut lire les images publiques,
-- mais seul un administrateur global authentifié peut les écrire ou les retirer.

alter table public.references_produit
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-reference-images',
  'product-reference-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin_insert_product_reference_images" on storage.objects;
create policy "admin_insert_product_reference_images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-reference-images'
  and public.est_administrateur_global_courant()
);

drop policy if exists "admin_update_product_reference_images" on storage.objects;
create policy "admin_update_product_reference_images"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-reference-images'
  and public.est_administrateur_global_courant()
)
with check (
  bucket_id = 'product-reference-images'
  and public.est_administrateur_global_courant()
);

drop policy if exists "admin_delete_product_reference_images" on storage.objects;
create policy "admin_delete_product_reference_images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-reference-images'
  and public.est_administrateur_global_courant()
);

create or replace function public.admin_associer_photo_reference(
  p_reference_produit_id uuid,
  p_photo_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := private.current_business_user_id();
  v_url text := nullif(btrim(p_photo_url), '');
begin
  if v_actor is null or not private.is_global_admin(v_actor) then
    raise exception 'Administration non autorisée';
  end if;
  if v_url is not null and v_url not like 'https://cvaysurwzkphmsvqujab.supabase.co/storage/v1/object/public/product-reference-images/%' then
    raise exception 'Adresse de photo non autorisée';
  end if;

  update public.references_produit
  set photo_url = v_url
  where reference_produit_id = p_reference_produit_id;
  if not found then raise exception 'Référence introuvable'; end if;

  insert into public.journal_administration(acteur_user_id, action_code, objet_type, objet_id, details)
  values(v_actor, 'PHOTO_REFERENCE_CONFIGUREE', 'REFERENCE_PRODUIT', p_reference_produit_id, jsonb_build_object('photo_presente', v_url is not null));
  return p_reference_produit_id;
end
$function$;

revoke all on function public.admin_associer_photo_reference(uuid,text) from public, anon;
grant execute on function public.admin_associer_photo_reference(uuid,text) to authenticated;

notify pgrst, 'reload schema';
