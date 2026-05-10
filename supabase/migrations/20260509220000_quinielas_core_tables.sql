begin;

create table if not exists public.matches (
  id text primary key,
  phase text not null,
  group_name text,
  home_team_id text not null,
  away_team_id text not null,
  kickoff_at timestamptz not null,
  status text not null,
  home_goals int,
  away_goals int,
  qualified_team_id text,
  manual_override boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  phase text not null,
  match_id text not null references public.matches(id) on delete cascade,
  home_goals int not null,
  away_goals int not null,
  predicted_qualified_team_id text,
  updated_at timestamptz not null default now(),
  primary key(user_id, phase, match_id)
);

create table if not exists public.phase_submissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  phase text not null,
  confirmed_at timestamptz not null default now(),
  auto_confirmed boolean not null default false,
  primary key(user_id, phase)
);

create table if not exists public.phase_window_overrides (
  phase text primary key,
  opens_at timestamptz not null,
  closes_at timestamptz not null
);

create index if not exists idx_matches_phase_kickoff on public.matches(phase, kickoff_at);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_predictions_user on public.predictions(user_id);

alter table public.matches enable row level security;
drop policy if exists matches_public_read on public.matches;
create policy matches_public_read on public.matches
for select using (true);

alter table public.predictions enable row level security;
alter table public.phase_submissions enable row level security;

drop policy if exists predictions_owner_rw on public.predictions;
create policy predictions_owner_rw on public.predictions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists submissions_owner_rw on public.phase_submissions;
create policy submissions_owner_rw on public.phase_submissions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;
