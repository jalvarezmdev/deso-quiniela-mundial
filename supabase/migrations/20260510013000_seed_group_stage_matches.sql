-- Seed Group Stage matches (Groups A-D) for World Cup 2026 quiniela.
-- Idempotent upsert by match id.

insert into public.matches (
  id,
  phase,
  group_name,
  home_team_id,
  away_team_id,
  kickoff_at,
  status,
  home_goals,
  away_goals,
  qualified_team_id,
  manual_override,
  deleted_at
)
values
  ('ga-1', 'groups', 'Grupo A', 'mex', 'zaf', '2026-06-11T17:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('ga-2', 'groups', 'Grupo A', 'kor', 'cze', '2026-06-11T20:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('ga-3', 'groups', 'Grupo A', 'mex', 'kor', '2026-06-18T17:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('ga-4', 'groups', 'Grupo A', 'cze', 'zaf', '2026-06-18T20:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('ga-5', 'groups', 'Grupo A', 'cze', 'mex', '2026-06-24T17:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('ga-6', 'groups', 'Grupo A', 'zaf', 'kor', '2026-06-24T20:00:00.000Z', 'scheduled', null, null, null, false, null),

  ('gb-1', 'groups', 'Grupo B', 'can', 'bih', '2026-06-12T17:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gb-2', 'groups', 'Grupo B', 'qat', 'sui', '2026-06-13T20:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gb-3', 'groups', 'Grupo B', 'can', 'qat', '2026-06-18T21:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gb-4', 'groups', 'Grupo B', 'sui', 'bih', '2026-06-18T23:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gb-5', 'groups', 'Grupo B', 'sui', 'can', '2026-06-24T17:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gb-6', 'groups', 'Grupo B', 'bih', 'qat', '2026-06-24T20:00:00.000Z', 'scheduled', null, null, null, false, null),

  ('gc-1', 'groups', 'Grupo C', 'bra', 'mar', '2026-06-13T17:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gc-2', 'groups', 'Grupo C', 'hai', 'sco', '2026-06-13T20:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gc-3', 'groups', 'Grupo C', 'bra', 'hai', '2026-06-19T17:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gc-4', 'groups', 'Grupo C', 'sco', 'mar', '2026-06-19T20:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gc-5', 'groups', 'Grupo C', 'sco', 'bra', '2026-06-24T21:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gc-6', 'groups', 'Grupo C', 'mar', 'hai', '2026-06-24T23:00:00.000Z', 'scheduled', null, null, null, false, null),

  ('gd-1', 'groups', 'Grupo D', 'usa', 'par', '2026-06-12T20:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gd-2', 'groups', 'Grupo D', 'aus', 'tur', '2026-06-13T23:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gd-3', 'groups', 'Grupo D', 'usa', 'aus', '2026-06-19T21:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gd-4', 'groups', 'Grupo D', 'tur', 'par', '2026-06-19T23:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gd-5', 'groups', 'Grupo D', 'tur', 'usa', '2026-06-25T20:00:00.000Z', 'scheduled', null, null, null, false, null),
  ('gd-6', 'groups', 'Grupo D', 'par', 'aus', '2026-06-25T23:00:00.000Z', 'scheduled', null, null, null, false, null)
on conflict (id) do update set
  phase = excluded.phase,
  group_name = excluded.group_name,
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  kickoff_at = excluded.kickoff_at,
  status = excluded.status,
  home_goals = excluded.home_goals,
  away_goals = excluded.away_goals,
  qualified_team_id = excluded.qualified_team_id,
  manual_override = excluded.manual_override,
  deleted_at = null,
  updated_at = now();
