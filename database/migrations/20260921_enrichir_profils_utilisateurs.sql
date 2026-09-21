-- Enrichit les profils sans casser le champ historique `nom`, utilisé comme
-- prénom d'affichage dans l'application. Les fiches existantes restent valides
-- et sont signalées comme incomplètes jusqu'à leur mise à jour par un admin.
alter table public.utilisateurs
  add column if not exists prenom text,
  add column if not exists nom_famille text,
  add column if not exists civilite text,
  add column if not exists email text,
  add column if not exists telephone text;

update public.utilisateurs
set prenom = nom
where prenom is null;

alter table public.utilisateurs
  drop constraint if exists utilisateurs_civilite_check,
  add constraint utilisateurs_civilite_check
    check (civilite is null or civilite in ('M', 'MME', 'MLLE')),
  drop constraint if exists utilisateurs_email_check,
  add constraint utilisateurs_email_check
    check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

create unique index if not exists utilisateurs_email_unique
  on public.utilisateurs (lower(email))
  where email is not null;

create or replace function public.admin_creer_utilisateur_complet(
  p_civilite text,
  p_prenom text,
  p_nom_famille text,
  p_email text,
  p_telephone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;
  v_id uuid;
  v_civilite text := upper(nullif(btrim(p_civilite), ''));
  v_prenom text := nullif(btrim(p_prenom), '');
  v_nom_famille text := nullif(btrim(p_nom_famille), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_telephone text := nullif(btrim(p_telephone), '');
begin
  v_actor := private.current_business_user_id();
  if v_actor is null or not private.is_global_admin(v_actor) then
    raise exception 'Administration non autorisée';
  end if;

  if v_civilite is null or v_civilite not in ('M', 'MME', 'MLLE') then
    raise exception 'Civilité obligatoire';
  end if;
  if v_prenom is null or v_nom_famille is null then
    raise exception 'Prénom et nom obligatoires';
  end if;
  if v_email is null or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;
  if v_telephone is null then
    raise exception 'Numéro de téléphone obligatoire';
  end if;

  -- La fonction historique conserve toutes ses protections et son audit.
  v_id := public.admin_creer_utilisateur(v_prenom);

  update public.utilisateurs
  set prenom = v_prenom,
      nom_famille = v_nom_famille,
      civilite = v_civilite,
      email = v_email,
      telephone = v_telephone
  where user_id = v_id;

  return v_id;
end
$function$;

create or replace function public.admin_configurer_utilisateur_complet(
  p_user_id uuid,
  p_civilite text,
  p_prenom text,
  p_nom_famille text,
  p_email text,
  p_telephone text,
  p_actif boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;
  v_before public.utilisateurs%rowtype;
  v_civilite text := upper(nullif(btrim(p_civilite), ''));
  v_prenom text := nullif(btrim(p_prenom), '');
  v_nom_famille text := nullif(btrim(p_nom_famille), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_telephone text := nullif(btrim(p_telephone), '');
begin
  v_actor := private.current_business_user_id();
  if v_actor is null or not private.is_global_admin(v_actor) then
    raise exception 'Administration non autorisée';
  end if;

  if v_civilite is null or v_civilite not in ('M', 'MME', 'MLLE') then
    raise exception 'Civilité obligatoire';
  end if;
  if v_prenom is null or v_nom_famille is null then
    raise exception 'Prénom et nom obligatoires';
  end if;
  if v_email is null or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;
  if v_telephone is null then
    raise exception 'Numéro de téléphone obligatoire';
  end if;

  select * into v_before
  from public.utilisateurs
  where user_id = p_user_id;
  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

  -- Réutilise la logique historique de désactivation des détenteurs et routes.
  perform public.admin_configurer_utilisateur(p_user_id, v_prenom, p_actif);

  update public.utilisateurs
  set prenom = v_prenom,
      nom_famille = v_nom_famille,
      civilite = v_civilite,
      email = v_email,
      telephone = v_telephone
  where user_id = p_user_id;

  insert into public.journal_administration(
    acteur_user_id, action_code, objet_type, objet_id, details
  ) values (
    v_actor,
    'PROFIL_UTILISATEUR_CONFIGURE',
    'UTILISATEUR',
    p_user_id,
    jsonb_build_object(
      'civilite_modifiee', v_before.civilite is distinct from v_civilite,
      'prenom_modifie', v_before.prenom is distinct from v_prenom,
      'nom_modifie', v_before.nom_famille is distinct from v_nom_famille,
      'email_modifie', v_before.email is distinct from v_email,
      'telephone_modifie', v_before.telephone is distinct from v_telephone
    )
  );

  return p_user_id;
end
$function$;

-- Les RPC privilégiées sont accessibles uniquement après authentification et
-- revérifient systématiquement le rôle Administrateur global côté serveur.
revoke all on function public.admin_creer_utilisateur_complet(text, text, text, text, text) from public, anon;
revoke all on function public.admin_configurer_utilisateur_complet(uuid, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.admin_creer_utilisateur_complet(text, text, text, text, text) to authenticated;
grant execute on function public.admin_configurer_utilisateur_complet(uuid, text, text, text, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
