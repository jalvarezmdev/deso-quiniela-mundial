-- MVP schema for Quiniela Mundial 2026
-- Apply with Supabase SQL editor or migration tooling.

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  nickname text not null unique,
  team_id text not null,
  pin_hash text not null,
  is_admin boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.phase_submissions enable row level security;

create policy if not exists profiles_self_read on public.profiles
for select using (auth.uid() = id);

create policy if not exists profiles_self_write on public.profiles
for update using (auth.uid() = id);

create policy if not exists predictions_owner_rw on public.predictions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists submissions_owner_rw on public.phase_submissions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Matches are public-readable.
alter table public.matches enable row level security;
create policy if not exists matches_public_read on public.matches
for select using (true);
