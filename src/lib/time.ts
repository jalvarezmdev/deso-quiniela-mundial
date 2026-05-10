const VEN_TZ = 'America/Caracas'

export function toVenDateTimeLabel(isoDate: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: VEN_TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

export function toVenShortDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: VEN_TZ,
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate))
}

export function toVenShortTimeLabel(isoDate: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: VEN_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

export function toVenDateInputValue(isoDate: string): string {
  const date = new Date(isoDate)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VEN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value
      }
      return acc
    }, {})

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function toVenDateTimeInputValue(isoDate: string): string {
  const date = new Date(isoDate)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VEN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value
      }
      return acc
    }, {})

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function fromVenDateTimeInput(input: string): string {
  // Browser input is local-time; we keep UX simple and normalize to ISO.
  return new Date(input).toISOString()
}

export function nowIso(): string {
  return new Date().toISOString()
}
