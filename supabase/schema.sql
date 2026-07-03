-- MVP schema for Quiniela Mundial 2026
-- Apply with Supabase SQL editor or migration tooling.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nickname text not null,
  team_id text not null,
  pin_hash text not null,
  is_admin boolean not null default false,
  onboarding_completed boolean not null default false,
  token_version integer not null default 1,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chk_profiles_nickname_length
    check (char_length(nickname) <= 50)
);

create unique index if not exists ux_profiles_email_active
on public.profiles(lower(email))
where deleted_at is null;

create unique index if not exists ux_profiles_nickname_active
on public.profiles(lower(nickname))
where deleted_at is null;

create table if not exists public.teams (
  id text primary key,
  name text not null,
  flag text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
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
  source text not null default 'manual',
  external_match_ref text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chk_matches_status
    check (status in ('scheduled', 'live', 'final')),
  constraint chk_matches_team_distinct
    check (home_team_id <> away_team_id),
  constraint chk_matches_score_nonnegative
    check (
      (home_goals is null or home_goals >= 0) and
      (away_goals is null or away_goals >= 0)
    ),
  constraint chk_matches_qualified_in_match
    check (
      qualified_team_id is null or
      qualified_team_id = home_team_id or
      qualified_team_id = away_team_id
    ),
  constraint chk_matches_scheduled_clean
    check (
      status <> 'scheduled' or
      (home_goals is null and away_goals is null and qualified_team_id is null)
    ),
  constraint chk_matches_live_or_final_has_scores
    check (
      status = 'scheduled' or
      (home_goals is not null and away_goals is not null)
    ),
  constraint chk_matches_groups_without_qualified
    check (
      phase <> 'groups' or qualified_team_id is null
    ),
  constraint chk_matches_knockout_final_requires_qualified
    check (
      not (phase <> 'groups' and status = 'final' and qualified_team_id is null)
    ),
  constraint fk_matches_home_team
    foreign key (home_team_id) references public.teams(id),
  constraint fk_matches_away_team
    foreign key (away_team_id) references public.teams(id),
  constraint fk_matches_qualified_team
    foreign key (qualified_team_id) references public.teams(id)
);

create table if not exists public.predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  phase text not null,
  match_id text not null references public.matches(id) on delete cascade,
  home_goals int not null,
  away_goals int not null,
  predicted_qualified_team_id text,
  updated_at timestamptz not null default now(),
  constraint fk_predictions_qualified_team
    foreign key (predicted_qualified_team_id) references public.teams(id),
  constraint chk_predictions_groups_without_qualified
    check (
      phase <> 'groups' or predicted_qualified_team_id is null
    ),
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
  closes_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists idx_matches_phase_kickoff on public.matches(phase, kickoff_at);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_matches_phase_kickoff_active
on public.matches(phase, kickoff_at)
where deleted_at is null;
create index if not exists idx_matches_status_active
on public.matches(status)
where deleted_at is null;
create unique index if not exists ux_matches_source_external_active
on public.matches(source, external_match_ref)
where deleted_at is null and external_match_ref is not null;
create index if not exists idx_predictions_user on public.predictions(user_id);
create index if not exists idx_phase_window_overrides_active
on public.phase_window_overrides(phase)
where deleted_at is null;
create index if not exists idx_teams_active
on public.teams(id)
where deleted_at is null;
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.phase_submissions enable row level security;

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
