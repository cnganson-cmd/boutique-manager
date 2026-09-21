-- Conserve la provenance du visuel collecté. La copie dans Storage est réalisée
-- uniquement après validation du produit par un administrateur.
alter table public.candidats_import_catalogue add column if not exists source_photo_url text;

update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/CREME_CARO_CARE_300_G_451d5b3dc5.png' where source_code='LANA_SITE' and marque='Caro Care' and nom_produit='Crème clarifiante';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/LAIT_HYDRATANT_CARODERMA_1000_ML_5de1f5d68d.png' where source_code='LANA_SITE' and marque='Caroderma' and nom_produit='Lotion hydratante';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/EVERY_BODY_COCONUT_900_ML_33d98edc19.png' where source_code='LANA_SITE' and marque='Every Body' and nom_produit='Lotion hydratante' and variante='Coco';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/LAIT_HYDRAT_GLYCERINE_1000_500_ML_4bed2cfe17.png' where source_code='LANA_SITE' and marque='Hydrat 1000' and nom_produit='Lotion hydratante';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/Huile_White_Now_c83606aefe.png' where source_code='LANA_SITE' and marque='White Now' and nom_produit='Huile clarifiante';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/GEL_CLARIFIANT_WHITE_NOW_1_L_d46cfd3671.png' where source_code='LANA_SITE' and marque='White Now' and nom_produit='Gel douche clarifiant et exfoliant';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/HUILE_CLARIFIANTE_T_JAUNE_125_ML_799e66ee1c.png' where source_code='LANA_SITE' and marque='Teint Jaune' and nom_produit='Huile clarifiante';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/GEL_DOUCHE_T_JAUNE_1000_L_ceae453651.png' where source_code='LANA_SITE' and marque='Teint Jaune' and nom_produit='Gel douche clarifiant et exfoliant';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/CREME_SUPER_WHITE_300_G_912ffa1325.png' where source_code='LANA_SITE' and marque='Super White' and nom_produit='Crème clarifiante';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/SAVON_GOMMANT_LANADERM_230_G_01_f58f2662b5.png' where source_code='LANA_SITE' and marque='Lanaderm' and nom_produit='Savon exfoliant';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/Creme_defrisante_9d50e6c8df.png' where source_code='LANA_SITE' and marque='American Hair Care' and nom_produit='Crème défrisante' and variante='Regular';
update public.candidats_import_catalogue set source_photo_url='https://admin.lana-biocosmetics.com/uploads/Creme_defrisante_super_150g_00186b08ba.png' where source_code='LANA_SITE' and marque='American Hair Care' and nom_produit='Crème défrisante' and variante='Super';

notify pgrst, 'reload schema';
