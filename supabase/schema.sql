-- =========================================================
--  Tastenrausch – Supabase-Schema
--  Einmal komplett im Supabase SQL-Editor ausführen.
-- =========================================================

-- ---------- Profile ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text not null check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  total_score   bigint not null default 0,
  endless_best  int not null default 0,
  rating        int not null default 1000,
  wins          int not null default 0,
  losses        int not null default 0,
  imported      boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Nur Name darf direkt geschrieben werden – Punkte/Elo nur über Funktionen.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert (id, username) on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;

-- ---------- Scores ----------
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles on delete cascade,
  level       int not null,          -- 0..14 Kampagne, -1 = Endlos
  score       int not null,
  wpm         real not null,
  accuracy    real not null,
  max_streak  int not null,
  created_at  timestamptz not null default now()
);
create index if not exists scores_level_score on public.scores (level, score desc);
create index if not exists scores_created on public.scores (created_at);

alter table public.scores enable row level security;
drop policy if exists "scores read" on public.scores;
create policy "scores read" on public.scores for select using (true);
revoke insert, update, delete on public.scores from anon, authenticated;
grant select on public.scores to anon, authenticated;

create or replace function public.submit_score(p_level int, p_score int, p_wpm real, p_acc real, p_streak int, p_chars int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'Kein Profil'; end if;
  if p_level < -1 or p_level > 14
     or p_wpm < 0 or p_wpm > 250
     or p_acc < 0 or p_acc > 100
     or p_chars < 1 or p_chars > 20000
     or p_streak < 0 or p_streak > p_chars
     or p_score < 0 or p_score > p_chars * 1300 + 20000 then
    raise exception 'Unplausibles Ergebnis';
  end if;
  insert into scores (user_id, level, score, wpm, accuracy, max_streak)
    values (auth.uid(), p_level, p_score, p_wpm, p_acc, p_streak);
  update profiles
     set total_score = total_score + p_score,
         endless_best = case when p_level = -1 then greatest(endless_best, p_score) else endless_best end
   where id = auth.uid();
end $$;

-- Lokalen Singleplayer-Stand einmalig ins Profil übernehmen (gedeckelt).
create or replace function public.import_local(p_total bigint, p_endless int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set total_score  = total_score + least(greatest(p_total, 0), 250000),
         endless_best = greatest(endless_best, least(greatest(p_endless, 0), 200000)),
         imported     = true
   where id = auth.uid() and not imported;
end $$;

-- ---------- Ranglisten-Views ----------
create or replace view public.leaderboard_week with (security_invoker = on) as
  select p.id, p.username, sum(s.score)::bigint as score
    from public.scores s join public.profiles p on p.id = s.user_id
   where s.created_at > now() - interval '7 days'
   group by p.id, p.username;

create or replace view public.leaderboard_level with (security_invoker = on) as
  select p.id, p.username, s.level, max(s.score) as score, max(s.wpm) as wpm
    from public.scores s join public.profiles p on p.id = s.user_id
   group by p.id, p.username, s.level;

grant select on public.leaderboard_week, public.leaderboard_level to anon, authenticated;

-- ---------- Freundschaften ----------
create table if not exists public.friendships (
  requester_id uuid not null references public.profiles on delete cascade,
  addressee_id uuid not null references public.profiles on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;
drop policy if exists "friends read" on public.friendships;
drop policy if exists "friends accept" on public.friendships;
drop policy if exists "friends delete" on public.friendships;
create policy "friends read" on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy "friends accept" on public.friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid() and status = 'accepted');
create policy "friends delete" on public.friendships for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));
revoke insert, update, delete on public.friendships from anon, authenticated;
grant select, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

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
  insert into friendships (requester_id, addressee_id) values (auth.uid(), target);
  return 'requested';
end $$;

-- ---------- Battles ----------
create table if not exists public.battles (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  host_id      uuid not null references public.profiles on delete cascade,
  guest_id     uuid references public.profiles on delete cascade,
  is_public    boolean not null default false,
  mode         text not null default 'race' check (mode in ('race', 'timed')),
  duration_s   int not null default 60 check (duration_s in (30, 60, 120)),
  attacks      boolean not null default true,
  level        int not null default 13 check (level between 0 and 14),
  seed         int not null default 0,
  status       text not null default 'waiting' check (status in ('waiting', 'running', 'finished')),
  host_result  jsonb,
  guest_result jsonb,
  winner_id    uuid,
  host_delta   int,
  guest_delta  int,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists battles_open on public.battles (status, is_public, created_at);

alter table public.battles enable row level security;
drop policy if exists "battles read" on public.battles;
drop policy if exists "battles host update" on public.battles;
create policy "battles read" on public.battles for select to authenticated
  using (auth.uid() in (host_id, guest_id) or (status = 'waiting' and guest_id is null));
create policy "battles host update" on public.battles for update to authenticated
  using (host_id = auth.uid() and status <> 'finished')
  with check (host_id = auth.uid() and status in ('waiting', 'running'));
revoke insert, update, delete on public.battles from anon, authenticated;
grant select on public.battles to authenticated;
grant update (mode, duration_s, attacks, level, seed, status) on public.battles to authenticated;

create or replace function public.create_battle(p_public boolean default false)
returns public.battles language plpgsql security definer set search_path = public as $$
declare b battles; c text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from battles where code = c);
  end loop;
  insert into battles (code, host_id, is_public) values (c, auth.uid(), p_public) returning * into b;
  return b;
end $$;

create or replace function public.join_battle(p_code text)
returns public.battles language plpgsql security definer set search_path = public as $$
declare b battles;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into b from battles where code = upper(trim(p_code)) for update;
  if b.id is null then raise exception 'Raum nicht gefunden'; end if;
  if b.host_id = auth.uid() or b.guest_id = auth.uid() then return b; end if;
  if b.guest_id is not null or b.status <> 'waiting' then raise exception 'Raum ist schon voll oder läuft bereits'; end if;
  update battles set guest_id = auth.uid() where id = b.id returning * into b;
  return b;
end $$;

create or replace function public.quick_match()
returns public.battles language plpgsql security definer set search_path = public as $$
declare b battles;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into b from battles
   where is_public and status = 'waiting' and guest_id is null and host_id <> auth.uid()
     and created_at > now() - interval '3 minutes'
   order by created_at
   limit 1
   for update skip locked;
  if b.id is not null then
    update battles set guest_id = auth.uid() where id = b.id returning * into b;
    return b;
  end if;
  delete from battles where host_id = auth.uid() and is_public and status = 'waiting' and guest_id is null;
  return create_battle(true);
end $$;

-- Ergebnis melden. Sobald beide gemeldet haben (oder der Gegner das
-- Match verlassen hat), wird der Sieger bestimmt und Elo verrechnet.
create or replace function public.report_result(p_id uuid, p_result jsonb, p_opponent_left boolean default false)
returns public.battles language plpgsql security definer set search_path = public as $$
declare
  b battles; me uuid := auth.uid(); w uuid;
  hr jsonb; gr jsonb; hf boolean; gf boolean;
  rh int; rg int; eh float; dh int;
begin
  select * into b from battles where id = p_id for update;
  if b.id is null or me is null or me not in (b.host_id, coalesce(b.guest_id, b.host_id)) then
    raise exception 'Kein Teilnehmer';
  end if;
  if b.guest_id is null then raise exception 'Kein Gegner'; end if;
  if b.status = 'finished' then return b; end if;

  if me = b.host_id then b.host_result := p_result; else b.guest_result := p_result; end if;
  hr := b.host_result; gr := b.guest_result;

  if p_opponent_left and ((me = b.host_id and gr is null) or (me = b.guest_id and hr is null)) then
    w := me;
  elsif hr is not null and gr is not null then
    if b.mode = 'race' then
      hf := coalesce((hr->>'finished')::boolean, false);
      gf := coalesce((gr->>'finished')::boolean, false);
      if hf and (not gf or (hr->>'time')::float <= (gr->>'time')::float) then w := b.host_id;
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

-- Funktionen nur für angemeldete Nutzer
revoke execute on function public.submit_score, public.import_local, public.add_friend,
  public.create_battle, public.join_battle, public.quick_match, public.report_result from public, anon;
grant execute on function public.submit_score, public.import_local, public.add_friend,
  public.create_battle, public.join_battle, public.quick_match, public.report_result to authenticated;

-- ---------- Singleplayer-Spielstand (Kampagne, Endlos, Tage-Streak) ----------
create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;

drop policy if exists "progress: eigenen lesen" on public.progress;
create policy "progress: eigenen lesen" on public.progress
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "progress: eigenen anlegen" on public.progress;
create policy "progress: eigenen anlegen" on public.progress
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "progress: eigenen ändern" on public.progress;
create policy "progress: eigenen ändern" on public.progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.progress from anon;
grant select, insert, update on public.progress to authenticated;
