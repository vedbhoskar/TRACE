export function shortHex(value: string, start = 8, end = 6): string {
  return `${value.slice(0, start)}…${value.slice(-end)}`
}

export function formatTimestamp(value: number | null): string {
  if (value === null) return 'Timestamp unavailable in cached snapshot'
  return `${new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value * 1000))} UTC`
}
