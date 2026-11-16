-- =========================================================
--  Sicherheits-Update (einmal im Supabase SQL-Editor ausführen)
--  Kann gefahrlos mehrfach ausgeführt werden.
-- =========================================================

-- ---------- 1. Private Räume nicht mehr für Fremde sichtbar ----------
-- Vorher konnte jeder angemeldete Nutzer alle offenen Räume samt Code
-- auslesen und so fremden privaten Räumen beitreten.
drop policy if exists "battles read" on public.battles;
create policy "battles read" on public.battles for select to authenticated
  using (auth.uid() in (host_id, guest_id));

-- ---------- 2. Punkte-Spam bremsen ----------
-- Vorher konnte man submit_score beliebig oft aufrufen und sich so an die
-- Spitze der Rangliste schummeln. Jetzt: realistische Obergrenze pro Zeichen
-- und eine Mindestpause (so lange, wie man den Text mit 250 WPM tippen würde).
alter table public.profiles add column if not exists last_score_at timestamptz;

create or replace function public.submit_score(p_level int, p_score int, p_wpm real, p_acc real, p_streak int, p_chars int)
returns void language plpgsql security definer set search_path = public as $$
declare last timestamptz;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select last_score_at into last from profiles where id = auth.uid() for update;
  if not found then raise exception 'Kein Profil'; end if;
  if p_level < -1 or p_level > 14
     or p_wpm < 0 or p_wpm > 250
     or p_acc < 0 or p_acc > 100
     or p_chars < 1 or p_chars > 20000
     or p_streak < 0 or p_streak > p_chars
     or p_score < 0 or p_score > p_chars * 250 + 15000 then
    raise exception 'Unplausibles Ergebnis';
  end if;
  if last is not null and now() - last < make_interval(secs => p_chars / 21.0) then
    raise exception 'Zu schnell hintereinander';
  end if;
  insert into scores (user_id, level, score, wpm, accuracy, max_streak)
    values (auth.uid(), p_level, p_score, p_wpm, p_acc, p_streak);
  update profiles
     set total_score = total_score + p_score,
         endless_best = case when p_level = -1 then greatest(endless_best, p_score) else endless_best end,
         last_score_at = now()
   where id = auth.uid();
end $$;

-- ---------- 3. Battle-Ergebnisse absichern ----------
-- a) Nur noch Zahlen speichern (vorher beliebiges JSON → damit hätte ein
--    Gegner Schadcode in deinen Ergebnis-Bildschirm schmuggeln können).
-- b) Ergebnisse nur für laufende Matches.
-- c) „Gegner hat verlassen“ erst nach 10 Sekunden Spielzeit, damit man sich
--    nicht direkt nach dem Start einen Sieg holen kann.
alter table public.battles add column if not exists started_at timestamptz;

create or replace function public.battles_set_started() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'running' and old.status is distinct from 'running' then new.started_at := now(); end if;
  return new;
end $$;
drop trigger if exists battles_started on public.battles;
create trigger battles_started before update on public.battles
  for each row execute function public.battles_set_started();

create or replace function public.clean_result(r jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
begin
  return jsonb_build_object(
    'finished',  coalesce((r->>'finished')::boolean, false),
    'time',      least(greatest(coalesce((r->>'time')::numeric, 0), 0), 3600000)::int,
    'pos',       least(greatest(coalesce((r->>'pos')::numeric, 0), 0), 100000)::int,
    'score',     least(greatest(coalesce((r->>'score')::numeric, 0), 0), 100000000)::int,
    'wpm',       least(greatest(coalesce((r->>'wpm')::numeric, 0), 0), 300)::int,
    'acc',       least(greatest(coalesce((r->>'acc')::numeric, 0), 0), 100)::int,
    'maxStreak', least(greatest(coalesce((r->>'maxStreak')::numeric, 0), 0), 100000)::int);
exception when others then
  raise exception 'Ungültiges Ergebnis';
end $$;

create or replace function public.report_result(p_id uuid, p_result jsonb, p_opponent_left boolean default false)
returns public.battles language plpgsql security definer set search_path = public as $$
declare
  b battles; me uuid := auth.uid(); w uuid; res jsonb := public.clean_result(p_result);
  hr jsonb; gr jsonb; hf boolean; gf boolean;
  rh int; rg int; eh float; dh int;
begin
  select * into b from battles where id = p_id for update;
  if b.id is null or me is null or me not in (b.host_id, coalesce(b.guest_id, b.host_id)) then
    raise exception 'Kein Teilnehmer';
  end if;
  if b.guest_id is null then raise exception 'Kein Gegner'; end if;
  if b.status = 'finished' then return b; end if;
  if b.status <> 'running' then raise exception 'Match läuft nicht'; end if;

  if me = b.host_id then b.host_result := res; else b.guest_result := res; end if;
  hr := b.host_result; gr := b.guest_result;

  if p_opponent_left and ((me = b.host_id and gr is null) or (me = b.guest_id and hr is null))
     and b.started_at < now() - interval '10 seconds' then
    w := me;
  elsif hr is not null and gr is not null then
    if b.mode = 'race' then
      hf := (hr->>'finished')::boolean;
      gf := (gr->>'finished')::boolean;
      if hf and (not gf or (hr->>'time')::int <= (gr->>'time')::int) then w := b.host_id;
      elsif gf then w := b.guest_id;
      elsif (hr->>'pos')::int <> (gr->>'pos')::int then
        w := case when (hr->>'pos')::int > (gr->>'pos')::int then b.host_id else b.guest_id end;
      else
        w := case when (hr->>'score')::int >= (gr->>'score')::int then b.host_id else b.guest_id end;
      end if;
    else
      w := case when (hr->>'score')::int >= (gr->>'score')::int then b.host_id else b.guest_id end;
    end if;
  else
    update battles set host_result = b.host_result, guest_result = b.guest_result where id = b.id returning * into b;
    return b;
  end if;

  select rating into rh from profiles where id = b.host_id;
  select rating into rg from profiles where id = b.guest_id;
  eh := 1.0 / (1 + power(10, (rg - rh) / 400.0));
  dh := round(32 * ((case when w = b.host_id then 1 else 0 end) - eh));

  update profiles set rating = rating + dh, wins = wins + (w = id)::int, losses = losses + (w <> id)::int where id = b.host_id;
  update profiles set rating = rating - dh, wins = wins + (w = id)::int, losses = losses + (w <> id)::int where id = b.guest_id;

  update battles
     set host_result = b.host_result, guest_result = b.guest_result, winner_id = w,
         host_delta = dh, guest_delta = -dh, status = 'finished', finished_at = now()
   where id = b.id
   returning * into b;
  return b;
end $$;

-- ---------- 4. Spam-Bremsen ----------
-- Höchstens 30 offene Freundschaftsanfragen gleichzeitig.
create or replace function public.add_friend(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select id into target from profiles where lower(username) = lower(p_username);
  if target is null then return 'not_found'; end if;
  if target = auth.uid() then return 'self'; end if;
  if exists (select 1 from friendships where requester_id = target and addressee_id = auth.uid()) then
    update friendships set status = 'accepted' where requester_id = target and addressee_id = auth.uid();
    return 'accepted';
  end if;
  if exists (select 1 from friendships where requester_id = auth.uid() and addressee_id = target) then
    return 'exists';
  end if;
  if (select count(*) from friendships where requester_id = auth.uid() and status = 'pending') >= 30 then
    raise exception 'Zu viele offene Anfragen';
  end if;
  insert into friendships (requester_id, addressee_id) values (auth.uid(), target);
  return 'requested';
end $$;

-- Pro Spieler nur ein offener, leerer Raum: alte werden beim Erstellen aufgeräumt.
create or replace function public.create_battle(p_public boolean default false)
returns public.battles language plpgsql security definer set search_path = public as $$
declare b battles; c text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  delete from battles where host_id = auth.uid() and status = 'waiting' and guest_id is null;
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from battles where code = c);
  end loop;
  insert into battles (code, host_id, is_public) values (c, auth.uid(), p_public) returning * into b;
  return b;
end $$;

-- Spielstand-Speicher auf 16 KB pro Spieler begrenzen.
do $$ begin
  alter table public.progress add constraint progress_size check (pg_column_size(data) < 16384);
exception when duplicate_object then null; end $$;

-- Rechte wie gehabt: nur angemeldete Nutzer
revoke execute on function public.submit_score, public.add_friend, public.create_battle, public.report_result from public, anon;
grant execute on function public.submit_score, public.add_friend, public.create_battle, public.report_result to authenticated;
revoke execute on function public.clean_result from public, anon, authenticated;
