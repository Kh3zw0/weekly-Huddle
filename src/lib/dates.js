function toISODate(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Returns the next Thursday from `from` (inclusive — if `from` is a Thursday, returns it).
export function nextHuddleDateISO(from = new Date()) {
  const d = new Date(from)
  const day = d.getDay() // 0 = Sun ... 4 = Thu
  const diff = (4 - day + 7) % 7
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

// Default reporting period: the 7 days ending the day before the huddle date.
export function defaultReportingPeriod(huddleDateISO) {
  const huddleDate = new Date(`${huddleDateISO}T00:00:00`)
  const end = new Date(huddleDate)
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return { start: toISODate(start), end: toISODate(end) }
}
