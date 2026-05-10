begin;

create table if not exists public.teams (
  id text primary key,
  name text not null,
  flag text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into public.teams (id, name, flag)
values
  ('mex', 'Mexico', '🇲🇽'),
  ('zaf', 'South Africa', '🇿🇦'),
  ('kor', 'South Korea', '🇰🇷'),
  ('cze', 'Czech Republic', '🇨🇿'),
  ('can', 'Canada', '🇨🇦'),
  ('bih', 'Bosnia & Herzegovina', '🇧🇦'),
  ('qat', 'Qatar', '🇶🇦'),
  ('sui', 'Switzerland', '🇨🇭'),
  ('bra', 'Brazil', '🇧🇷'),
  ('mar', 'Morocco', '🇲🇦'),
  ('hai', 'Haiti', '🇭🇹'),
  ('sco', 'Scotland', '🏴'),
  ('usa', 'USA', '🇺🇸'),
  ('par', 'Paraguay', '🇵🇾'),
  ('aus', 'Australia', '🇦🇺'),
  ('tur', 'Turkey', '🇹🇷'),
  ('ger', 'Germany', '🇩🇪'),
  ('cuw', 'Curaçao', '🇨🇼'),
  ('civ', 'Ivory Coast', '🇨🇮'),
  ('ecu', 'Ecuador', '🇪🇨'),
  ('ned', 'Netherlands', '🇳🇱'),
  ('jpn', 'Japan', '🇯🇵'),
  ('swe', 'Sweden', '🇸🇪'),
  ('tun', 'Tunisia', '🇹🇳'),
  ('bel', 'Belgium', '🇧🇪'),
  ('egy', 'Egypt', '🇪🇬'),
  ('irn', 'Iran', '🇮🇷'),
  ('nzl', 'New Zealand', '🇳🇿'),
  ('esp', 'Spain', '🇪🇸'),
  ('cpv', 'Cape Verde', '🇨🇻'),
  ('ksa', 'Saudi Arabia', '🇸🇦'),
  ('uru', 'Uruguay', '🇺🇾'),
  ('fra', 'France', '🇫🇷'),
  ('sen', 'Senegal', '🇸🇳'),
  ('irq', 'Iraq', '🇮🇶'),
  ('nor', 'Norway', '🇳🇴'),
  ('arg', 'Argentina', '🇦🇷'),
  ('alg', 'Algeria', '🇩🇿'),
  ('aut', 'Austria', '🇦🇹'),
  ('jor', 'Jordan', '🇯🇴'),
  ('por', 'Portugal', '🇵🇹'),
  ('cod', 'DR Congo', '🇨🇩'),
  ('uzb', 'Uzbekistan', '🇺🇿'),
  ('col', 'Colombia', '🇨🇴'),
  ('eng', 'England', '🏴'),
  ('cro', 'Croatia', '🇭🇷'),
  ('gha', 'Ghana', '🇬🇭'),
  ('pan', 'Panama', '🇵🇦')
on conflict (id) do update set
  name = excluded.name,
  flag = excluded.flag,
  deleted_at = null,
  updated_at = now();

alter table public.matches
  add column if not exists source text not null default 'manual',
  add column if not exists external_match_ref text;

alter table public.matches
  drop constraint if exists chk_matches_status,
  add constraint chk_matches_status
    check (status in ('scheduled', 'live', 'final')),
  drop constraint if exists chk_matches_team_distinct,
  add constraint chk_matches_team_distinct
    check (home_team_id <> away_team_id),
  drop constraint if exists chk_matches_score_nonnegative,
  add constraint chk_matches_score_nonnegative
    check (
      (home_goals is null or home_goals >= 0) and
      (away_goals is null or away_goals >= 0)
    ),
  drop constraint if exists chk_matches_qualified_in_match,
  add constraint chk_matches_qualified_in_match
    check (
      qualified_team_id is null or
      qualified_team_id = home_team_id or
      qualified_team_id = away_team_id
    ),
  drop constraint if exists chk_matches_scheduled_clean,
  add constraint chk_matches_scheduled_clean
    check (
      status <> 'scheduled' or
      (home_goals is null and away_goals is null and qualified_team_id is null)
    ),
  drop constraint if exists chk_matches_live_or_final_has_scores,
  add constraint chk_matches_live_or_final_has_scores
    check (
      status = 'scheduled' or
      (home_goals is not null and away_goals is not null)
    ),
  drop constraint if exists chk_matches_groups_without_qualified,
  add constraint chk_matches_groups_without_qualified
    check (
      phase <> 'groups' or qualified_team_id is null
    ),
  drop constraint if exists chk_matches_knockout_final_requires_qualified,
  add constraint chk_matches_knockout_final_requires_qualified
    check (
      not (phase <> 'groups' and status = 'final' and qualified_team_id is null)
    );

alter table public.matches
  drop constraint if exists fk_matches_home_team,
  add constraint fk_matches_home_team
    foreign key (home_team_id) references public.teams(id),
  drop constraint if exists fk_matches_away_team,
  add constraint fk_matches_away_team
    foreign key (away_team_id) references public.teams(id),
  drop constraint if exists fk_matches_qualified_team,
  add constraint fk_matches_qualified_team
    foreign key (qualified_team_id) references public.teams(id);

alter table public.predictions
  drop constraint if exists fk_predictions_qualified_team,
  add constraint fk_predictions_qualified_team
    foreign key (predicted_qualified_team_id) references public.teams(id),
  drop constraint if exists chk_predictions_groups_without_qualified,
  add constraint chk_predictions_groups_without_qualified
    check (
      phase <> 'groups' or predicted_qualified_team_id is null
    );

create unique index if not exists ux_matches_source_external_active
on public.matches(source, external_match_ref)
where deleted_at is null and external_match_ref is not null;

create index if not exists idx_teams_active
on public.teams(id)
where deleted_at is null;

commit;
