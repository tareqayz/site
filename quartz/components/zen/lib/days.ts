// Calendar helpers shared by the build and the browser scripts. Keep Quartz imports out of this
// file: the *.inline.ts scripts bundle it.

const DAY_MS = 86_400_000

/** Days since 1970-01-01 for a YYYY-MM-DD date. */
export const toEpochDay = (iso: string): number =>
  Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS)

export const fromEpochDay = (day: number): string =>
  new Date(day * DAY_MS).toISOString().slice(0, 10)

export const yearOf = (day: number): number => new Date(day * DAY_MS).getUTCFullYear()
export const startOfYear = (year: number): number => Math.round(Date.UTC(year, 0, 1) / DAY_MS)
export const endOfYear = (year: number): number => Math.round(Date.UTC(year, 11, 31) / DAY_MS)

export const padDay = (n: number): string => String(Math.max(0, n)).padStart(3, "0")

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

/** "mon 24 nov" */
export function handDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = new Date(`${iso}T00:00:00Z`)
  const parts = [`${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`]
  if (opts.weekday !== false) parts.unshift(WEEKDAYS[d.getUTCDay()])
  if (opts.year) parts.push(String(d.getUTCFullYear()))
  return parts.join(" ")
}
