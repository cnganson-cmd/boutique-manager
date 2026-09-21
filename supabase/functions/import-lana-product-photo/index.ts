import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {"Access-Control-Allow-Origin":"https://cnganson-cmd.github.io","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
function serverKey(){const configured=Deno.env.get("SUPABASE_SECRET_KEYS");if(configured)return JSON.parse(configured).default as string;return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??""}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return reply({error:"Méthode non autorisée"},405);
  try{
    const authHeader=req.headers.get("Authorization")??"",token=authHeader.replace(/^Bearer\s+/i,"");
    if(!token)return reply({error:"Session absente"},401);
    const url=Deno.env.get("SUPABASE_URL")??"",anonKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
    const userClient=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
    const service=createClient(url,serverKey(),{auth:{persistSession:false}});
    const {data:authData,error:authError}=await userClient.auth.getUser(token);
    if(authError||!authData.user)return reply({error:"Session invalide"},401);
    const {data:isAdmin,error:adminError}=await userClient.rpc("est_administrateur_global_courant");
    if(adminError||isAdmin!==true)return reply({error:"Administration non autorisée"},403);
    const {candidate_id,product_id}=await req.json();
    if(!candidate_id||!product_id)return reply({error:"Produit ou import absent"},400);
    const {data:candidate,error:candidateError}=await service.from("candidats_import_catalogue").select("candidat_import_id,source_code,source_photo_url,statut,produit_id").eq("candidat_import_id",candidate_id).eq("source_code","LANA_SITE").single();
    if(candidateError||!candidate)return reply({error:"Import Lana introuvable"},404);
    if(candidate.statut!=="IMPORTE"||candidate.produit_id!==product_id)return reply({error:"Le produit doit d’abord être validé"},409);
    const source=new URL(candidate.source_photo_url??"");
    if(source.protocol!=="https:"||source.hostname!=="admin.lana-biocosmetics.com")return reply({error:"Source de photo non autorisée"},400);
    const {data:reference,error:referenceError}=await service.from("references_produit").select("reference_produit_id,photo_url").eq("produit_id",product_id).order("reference_produit_id").limit(1).single();
    if(referenceError||!reference)return reply({error:"Référence produit introuvable"},404);
    if(reference.photo_url?.includes("/product-reference-images/"))return reply({ok:true,photo_url:reference.photo_url,already_imported:true});
    const imageResponse=await fetch(source,{redirect:"follow"});
    if(!imageResponse.ok)throw new Error(`Photo Lana indisponible (${imageResponse.status})`);
    const contentType=(imageResponse.headers.get("content-type")??"").split(";")[0],extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"},extension=extensions[contentType];
    if(!extension)throw new Error("Format de photo Lana non autorisé");
    const bytes=await imageResponse.arrayBuffer();
    if(bytes.byteLength>5*1024*1024)throw new Error("La photo Lana dépasse 5 Mo");
    const path=`${reference.reference_produit_id}/lana-${candidate.candidat_import_id}.${extension}`;
    const {error:uploadError}=await service.storage.from("product-reference-images").upload(path,bytes,{contentType,cacheControl:"31536000",upsert:true});
    if(uploadError)throw uploadError;
    const {data:publicData}=service.storage.from("product-reference-images").getPublicUrl(path);
    const {error:associateError}=await userClient.rpc("admin_associer_photo_reference",{p_reference_produit_id:reference.reference_produit_id,p_photo_url:publicData.publicUrl});
    if(associateError){await service.storage.from("product-reference-images").remove([path]);throw associateError}
    return reply({ok:true,photo_url:publicData.publicUrl});
  }catch(error){return reply({error:error instanceof Error?error.message:"Import de photo impossible"},400)}
});
