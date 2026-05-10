begin;

alter table public.matches
  add column if not exists deleted_at timestamptz;

alter table public.phase_window_overrides
  add column if not exists deleted_at timestamptz;

create index if not exists idx_matches_phase_kickoff_active
  on public.matches(phase, kickoff_at)
  where deleted_at is null;

create index if not exists idx_matches_status_active
  on public.matches(status)
  where deleted_at is null;

create index if not exists idx_phase_window_overrides_active
  on public.phase_window_overrides(phase)
  where deleted_at is null;

commit;
