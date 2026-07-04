import { readFileSync } from "node:fs"

// OneFootball team names -> FIFA 3-letter codes
// Names taken from https://onefootball.com/en/competition/fifa-world-cup-12/results
export const TEAM_NAME_TO_ID: Record<string, string> = {
  Mexico: "mex",
  "South Africa": "zaf",
  "Korea Republic": "kor",
  "South Korea": "kor",
  Czechia: "cze",
  "Czech Republic": "cze",
  Canada: "can",
  "Bosnia & Herzegovina": "bih",
  Qatar: "qat",
  Switzerland: "sui",
  Brazil: "bra",
  Morocco: "mar",
  Haiti: "hai",
  Scotland: "sco",
  "United States": "usa",
  USA: "usa",
  Paraguay: "par",
  Australia: "aus",
  Turkey: "tur",
  Türkiye: "tur",
  Germany: "ger",
  Curaçao: "cuw",
  "Ivory Coast": "civ",
  "Cote d'Ivoire": "civ",
  "Côte d'Ivoire": "civ",
  Ecuador: "ecu",
  Netherlands: "ned",
  Japan: "jpn",
  Sweden: "swe",
  Tunisia: "tun",
  Belgium: "bel",
  Egypt: "egy",
  "IR Iran": "irn",
  Iran: "irn",
  "New Zealand": "nzl",
  Spain: "esp",
  "Cape Verde": "cpv",
  "Cabo Verde": "cpv",
  "Saudi Arabia": "ksa",
  Uruguay: "uru",
  France: "fra",
  Senegal: "sen",
  Iraq: "irq",
  Norway: "nor",
  Argentina: "arg",
  Algeria: "alg",
  Austria: "aut",
  Jordan: "jor",
  Portugal: "por",
  "DR Congo": "cod",
  "Congo DR": "cod",
  Uzbekistan: "uzb",
  Colombia: "col",
  England: "eng",
  Croatia: "cro",
  Ghana: "gha",
  Panama: "pan",
}

export function resolveTeamId(onefootballName: string): string | null {
  // Strip "Icon: " prefix that OneFootball adds to img[alt]
  const trimmed = onefootballName.replace(/^Icon:\s*/i, "").trim()
  const direct = TEAM_NAME_TO_ID[trimmed]
  if (direct) return direct

  const lower = trimmed.toLowerCase()
  for (const [key, id] of Object.entries(TEAM_NAME_TO_ID)) {
    if (key.toLowerCase() === lower) return id
  }

  return null
}

export function buildTeamGroupMap(teamsMetaPath: string): Map<string, string> {
  const raw = readFileSync(teamsMetaPath, "utf8")
  const teams = JSON.parse(raw) as Array<{ fifa_code: string; group: string }>
  const map = new Map<string, string>()
  for (const team of teams) {
    const code = team.fifa_code?.toLowerCase()
    if (!code || !team.group) continue
    const normalizedCode = code === "rsa" ? "zaf" : code
    map.set(normalizedCode, team.group)
  }
  return map
}

export function resolveGroupName(
  homeTeamId: string | null,
  teamGroupMap: Map<string, string>,
): string | null {
  if (!homeTeamId) return null
  const group = teamGroupMap.get(homeTeamId)
  return group ? `Grupo ${group}` : null
}

// Maps OneFootball round/section header text to phase keys
export function mapRoundToPhaseKey(
  roundName: string,
): { phase: string; groupName: string | null } {
  const trimmed = roundName.trim()

  // "Group A", "Group B", etc.
  const groupMatch = /^Group\s+([A-L])$/i.exec(trimmed)
  if (groupMatch) {
    return {
      phase: "groups",
      groupName: `Grupo ${groupMatch[1].toUpperCase()}`,
    }
  }

  // "Group stage: Matchday N" — these are still group phase
  if (/^group\s+stage/i.test(trimmed)) {
    return { phase: "groups", groupName: null }
  }

  const lower = trimmed.toLowerCase()

  if (lower.includes("round of 32")) return { phase: "roundOf16", groupName: null }
  if (lower.includes("round of 16")) return { phase: "roundOf8", groupName: null }
  if (lower.includes("quarter")) return { phase: "roundOf4", groupName: null }
  if (lower.includes("semi")) return { phase: "semifinals", groupName: null }
  if (lower.includes("third place") || lower.includes("3rd place")) {
    return { phase: "semifinals", groupName: null }
  }
  if (lower === "final") return { phase: "final", groupName: null }

  return { phase: "groups", groupName: trimmed }
}
