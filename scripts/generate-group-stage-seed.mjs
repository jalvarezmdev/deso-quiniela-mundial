#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const WORLDCUP_JSON_PATH = path.join(ROOT, 'supabase/functions/_shared/data/worldcup.json')
const TEAMS_META_PATH = path.join(ROOT, 'supabase/functions/_shared/data/worldcup.teams_meta.json')

const GROUP_LETTERS = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i))

const SLOT_MATCHUPS = [
  [0, 1], // t1 vs t2
  [2, 3], // t3 vs t4
  [0, 2], // t1 vs t3
  [3, 1], // t4 vs t2
  [3, 0], // t4 vs t1
  [1, 2], // t2 vs t3
]

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function parseKickoffToIsoUtc(date, timeWithOffset) {
  const match = /^(\d{2}):(\d{2})\s+UTC([+-]\d{1,2})$/.exec(String(timeWithOffset).trim())
  if (!match) {
    throw new Error(`Invalid time format: "${timeWithOffset}"`)
  }

  const [, hh, mm, offsetHoursRaw] = match
  const offsetHours = Number(offsetHoursRaw)
  const utcMillis = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(hh) - offsetHours,
    Number(mm),
    0,
    0,
  )

  return new Date(utcMillis).toISOString().replace('.000Z', '.000Z')
}

function toSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function buildTeamCodeByName(teamsMeta) {
  const map = new Map()
  for (const team of teamsMeta) {
    const rawCode = String(team.fifa_code || '').toLowerCase()
    const code = rawCode === 'rsa' ? 'zaf' : rawCode
    if (!code) continue

    map.set(team.name, code)
    if (team.name_normalised) {
      map.set(team.name_normalised, code)
    }
  }
  return map
}

function buildTeamsByGroup(teamsMeta) {
  const byGroup = new Map()
  for (const letter of GROUP_LETTERS) {
    byGroup.set(letter, [])
  }

  for (const team of teamsMeta) {
    const letter = String(team.group || '').trim().toUpperCase()
    if (!byGroup.has(letter)) continue
    byGroup.get(letter).push(team.name)
  }

  for (const letter of GROUP_LETTERS) {
    const teams = byGroup.get(letter)
    if (!teams || teams.length !== 4) {
      throw new Error(`Group ${letter} must have exactly 4 teams in teams_meta, got ${teams ? teams.length : 0}`)
    }
  }

  return byGroup
}

function buildMatchesLookup(worldCupMatches) {
  const grouped = new Map()

  for (const match of worldCupMatches) {
    const group = typeof match.group === 'string' ? match.group.trim() : ''
    const gm = /^Group\s+([A-L])$/.exec(group)
    if (!gm) continue

    const letter = gm[1]
    if (!grouped.has(letter)) grouped.set(letter, [])
    grouped.get(letter).push(match)
  }

  for (const letter of GROUP_LETTERS) {
    const matches = grouped.get(letter) || []
    if (matches.length !== 6) {
      throw new Error(`Group ${letter} must have exactly 6 matches in worldcup.json, got ${matches.length}`)
    }
  }

  return grouped
}

function findMatch(groupMatches, homeName, awayName) {
  const exact = groupMatches.find((m) => m.team1 === homeName && m.team2 === awayName)
  if (exact) return exact

  const reversed = groupMatches.find((m) => m.team1 === awayName && m.team2 === homeName)
  if (reversed) {
    throw new Error(`Expected exact home/away pair "${homeName} vs ${awayName}" but found reversed in source data`)
  }

  throw new Error(`Could not find match ${homeName} vs ${awayName}`)
}

function buildRows(worldCupMatches, teamsMeta) {
  const teamCodeByName = buildTeamCodeByName(teamsMeta)
  const teamsByGroup = buildTeamsByGroup(teamsMeta)
  const matchesByGroup = buildMatchesLookup(worldCupMatches)

  const rows = []

  for (const letter of GROUP_LETTERS) {
    const teams = teamsByGroup.get(letter)
    const groupMatches = matchesByGroup.get(letter)

    SLOT_MATCHUPS.forEach(([homeIdx, awayIdx], i) => {
      const homeName = teams[homeIdx]
      const awayName = teams[awayIdx]
      const sourceMatch = findMatch(groupMatches, homeName, awayName)

      const homeTeamId = teamCodeByName.get(homeName)
      const awayTeamId = teamCodeByName.get(awayName)

      if (!homeTeamId || !awayTeamId) {
        throw new Error(`Missing team id mapping for ${homeName} or ${awayName}`)
      }

      const matchId = `g${letter.toLowerCase()}-${i + 1}`
      const kickoffAt = parseKickoffToIsoUtc(sourceMatch.date, sourceMatch.time)

      rows.push({
        id: matchId,
        phase: 'groups',
        groupName: `Grupo ${letter}`,
        homeTeamId,
        awayTeamId,
        kickoffAt,
        status: 'scheduled',
      })
    })
  }

  if (rows.length !== 72) {
    throw new Error(`Expected 72 seeded rows, got ${rows.length}`)
  }

  return rows
}

function renderSql(rows) {
  const valuesSql = rows
    .map(
      (row) =>
        `  (${[
          toSqlString(row.id),
          toSqlString(row.phase),
          toSqlString(row.groupName),
          toSqlString(row.homeTeamId),
          toSqlString(row.awayTeamId),
          toSqlString(row.kickoffAt),
          toSqlString(row.status),
          'null',
          'null',
          'null',
          'false',
          'null',
        ].join(', ')})`,
    )
    .join(',\n')

  return `-- Seed Group Stage matches (Groups A-L) for World Cup 2026 quiniela.\n-- Generated from supabase/functions/_shared/data/worldcup.json\n-- Idempotent upsert by match id.\n\ninsert into public.matches (\n  id,\n  phase,\n  group_name,\n  home_team_id,\n  away_team_id,\n  kickoff_at,\n  status,\n  home_goals,\n  away_goals,\n  qualified_team_id,\n  manual_override,\n  deleted_at\n)\nvalues\n${valuesSql}\non conflict (id) do update set\n  phase = excluded.phase,\n  group_name = excluded.group_name,\n  home_team_id = excluded.home_team_id,\n  away_team_id = excluded.away_team_id,\n  kickoff_at = excluded.kickoff_at,\n  status = excluded.status,\n  home_goals = excluded.home_goals,\n  away_goals = excluded.away_goals,\n  qualified_team_id = excluded.qualified_team_id,\n  manual_override = excluded.manual_override,\n  deleted_at = null,\n  updated_at = now();\n`
}

function resolveOutputPath() {
  const outIndex = process.argv.findIndex((arg) => arg === '--out')
  if (outIndex !== -1 && process.argv[outIndex + 1]) {
    return path.resolve(ROOT, process.argv[outIndex + 1])
  }

  return path.join(
    ROOT,
    'supabase/migrations/20260510153000_seed_group_stage_matches_a_to_l.sql',
  )
}

function main() {
  const worldCup = readJson(WORLDCUP_JSON_PATH)
  const teamsMeta = readJson(TEAMS_META_PATH)

  if (!Array.isArray(worldCup.matches)) {
    throw new Error('worldcup.json must include a matches array')
  }
  if (!Array.isArray(teamsMeta)) {
    throw new Error('worldcup.teams_meta.json must be an array')
  }

  const rows = buildRows(worldCup.matches, teamsMeta)
  const outPath = resolveOutputPath()
  const sql = renderSql(rows)

  fs.writeFileSync(outPath, sql, 'utf8')
  console.log(`Generated ${rows.length} rows -> ${path.relative(ROOT, outPath)}`)
}

main()
