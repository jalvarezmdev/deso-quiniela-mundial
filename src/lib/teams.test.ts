import { describe, expect, it } from 'vitest'
import { TEAMS } from './teams'

describe('TEAMS', () => {
  it('contains only the 48 classified teams', () => {
    expect(TEAMS).toHaveLength(48)
  })

  it('keeps south africa as zaf and removes rsa legacy id', () => {
    expect(TEAMS.some((team) => team.id === 'zaf')).toBe(true)
    expect(TEAMS.some((team) => team.id === 'rsa')).toBe(false)
  })

  it('does not include non-classified ids', () => {
    expect(TEAMS.some((team) => team.id === 'ven')).toBe(false)
  })
})
