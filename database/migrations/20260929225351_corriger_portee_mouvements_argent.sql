-- Rattache les mouvements financiers historiques à leur détenteur physique,
-- puis corrige la politique de lecture pour que le repli par site soit corrélé
-- au mouvement courant. L'ancienne condition auto-comparait le site et pouvait
-- sélectionner un détenteur sans rapport avec le site du mouvement.
update public.mouvements_argent m
set detenteur_stock_id = h.detenteur_stock_id
from public.detenteurs_stock h
where m.detenteur_stock_id is null
  and m.site_id is not null
  and h.type_detenteur = 'SITE'
  and h.site_id = m.site_id;

drop policy if exists mouvements_argent_select on public.mouvements_argent;

create policy mouvements_argent_select
on public.mouvements_argent
for select
to authenticated
using (
  private.is_global_patron(private.current_business_user_id())
  or private.money_holder_actor(
    private.current_business_user_id(),
    coalesce(
      detenteur_stock_id,
      (
        select h.detenteur_stock_id
        from public.detenteurs_stock h
        where h.type_detenteur = 'SITE'
          and h.site_id = mouvements_argent.site_id
        limit 1
      )
    )
  )
);
