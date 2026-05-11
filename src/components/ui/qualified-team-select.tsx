import { cn } from '#/lib/cn'
import { TEAMS } from '#/lib/teams'

type QualifiedTeamSelectProps = {
  value: string
  onChange: (teamId: string) => void
  id?: string
  name?: string
  disabled?: boolean
  className?: string
}

export function QualifiedTeamSelect({ value, onChange, id, name, disabled, className }: QualifiedTeamSelectProps) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={cn('h-10 w-full rounded-md border border-[var(--line)] bg-[var(--secondary)] px-3 text-sm text-white', className)}
    >
      {TEAMS.map((team) => (
        <option key={team.id} value={team.id}>
          {team.flag} {team.name}
        </option>
      ))}
    </select>
  )
}
