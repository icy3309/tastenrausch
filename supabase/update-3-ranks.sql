-- =========================================================
--  Update 3: Rang-Verteilung & Account löschen
--  Einmal im Supabase SQL-Editor ausführen (mehrfach ausführbar).
-- =========================================================

-- Wie viele Spieler sind in welchem Rang? Gibt nur Zahlen zurück, keine Namen.
-- p_thresholds = Mindestpunkte je Rang, aufsteigend (z.B. {0,5000,20000,...}).
create or replace function public.rank_distribution(p_thresholds bigint[])
returns table (rank_idx int, players bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_thresholds is null or array_length(p_thresholds, 1) is null or array_length(p_thresholds, 1) > 20 then
    raise exception 'Ungültige Ränge';
  end if;
  return query
    select greatest(width_bucket(p.total_score, p_thresholds), 1) - 1 as rank_idx, count(*)::bigint
      from profiles p
     group by 1
     order by 1;
end $$;
revoke execute on function public.rank_distribution from public;
grant execute on function public.rank_distribution to anon, authenticated;

-- Eigenen Account endgültig löschen (Recht auf Löschung, Art. 17 DSGVO).
-- Löscht den Login und – über die Verknüpfungen – Profil, Punkte, Freundschaften,
-- Battles und Spielstand.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.battles where host_id = me or guest_id = me;
  delete from auth.users where id = me;
end $$;
revoke execute on function public.delete_my_account from public, anon;
grant execute on function public.delete_my_account to authenticated;
