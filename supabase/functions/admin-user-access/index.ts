import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://cnganson-cmd.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Méthode non autorisée" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Session absente" }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const service = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return reply({ error: "Session invalide" }, 401);
    const { data: isAdmin, error: adminError } = await userClient.rpc("est_administrateur_global_courant");
    if (adminError || isAdmin !== true) return reply({ error: "Administration non autorisée" }, 403);

    const { action, user_id } = await req.json();
    if (!user_id || !["invite", "reset", "sync_email"].includes(action)) {
      return reply({ error: "Action invalide" }, 400);
    }

    const { data: profile, error: profileError } = await service
      .from("utilisateurs")
      .select("user_id,prenom,email,auth_user_id,actif")
      .eq("user_id", user_id)
      .single();
    if (profileError || !profile) return reply({ error: "Utilisateur introuvable" }, 404);
    if (!profile.email) return reply({ error: "Complétez d’abord l’adresse e-mail de la fiche" }, 400);

    const redirectTo = "https://cnganson-cmd.github.io/boutique-manager/";
    let linkedAuthId = profile.auth_user_id as string | null;

    if (action === "invite") {
      if (!linkedAuthId) {
        const { data: listed, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listError) throw listError;
        const existing = listed.users.find((u) => u.email?.toLowerCase() === profile.email.toLowerCase());
        if (existing) {
          linkedAuthId = existing.id;
        } else {
          const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(profile.email, {
            redirectTo,
            data: { prenom: profile.prenom ?? "" },
          });
          if (inviteError) throw inviteError;
          linkedAuthId = invited.user.id;
        }
        const { error: linkError } = await service.from("utilisateurs").update({ auth_user_id: linkedAuthId }).eq("user_id", user_id).is("auth_user_id", null);
        if (linkError) throw linkError;
      } else {
        const { error: resetError } = await service.auth.resetPasswordForEmail(profile.email, { redirectTo });
        if (resetError) throw resetError;
      }
    }

    if (action === "reset") {
      if (!linkedAuthId) return reply({ error: "Ce profil n’a pas encore de compte de connexion" }, 400);
      const { error } = await service.auth.resetPasswordForEmail(profile.email, { redirectTo });
      if (error) throw error;
    }

    if (action === "sync_email") {
      if (!linkedAuthId) return reply({ error: "Ce profil n’a pas encore de compte de connexion" }, 400);
      const { error } = await service.auth.admin.updateUserById(linkedAuthId, { email: profile.email });
      if (error) throw error;
    }

    const actor = await service.from("utilisateurs").select("user_id").eq("auth_user_id", authData.user.id).single();
    if (actor.data) {
      await service.from("journal_administration").insert({
        acteur_user_id: actor.data.user_id,
        action_code: `COMPTE_${String(action).toUpperCase()}`,
        objet_type: "UTILISATEUR",
        objet_id: user_id,
        details: { compte_lie: Boolean(linkedAuthId) },
      });
    }

    return reply({ ok: true, linked: Boolean(linkedAuthId) });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Erreur serveur" }, 400);
  }
});
