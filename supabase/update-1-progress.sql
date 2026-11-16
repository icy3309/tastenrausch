-- ---------- Singleplayer-Spielstand (Kampagne, Endlos, Tage-Streak) ----------
-- Wer schon schema.sql ausgeführt hat, führt nur diese Datei zusätzlich aus.
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
