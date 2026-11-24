import type { QuartzPluginData } from "../../../plugins/vfile"
import type { FullSlug } from "../../../util/path"
import { toEpochDay } from "./days"

export { fromEpochDay, handDate, padDay, toEpochDay } from "./days"

/** Daily logs live in content/log/YYYY-MM-DD.md */
export const LOG_FOLDER = "log"

export interface Domain {
  id: string
  short: string
  label: string
}

/** The 8 axes of the Unorthodox radar (unorthodox/src/domains/domains.ts), used as tags. */
export const DOMAINS: Domain[] = [
  { id: "strength", short: "STR", label: "Strength" },
  { id: "power", short: "PWR", label: "Power" },
  { id: "endurance", short: "END", label: "Muscular Endurance" },
  { id: "cardio", short: "CAR", label: "Cardio Endurance" },
  { id: "flexibility", short: "FLX", label: "Flexibility" },
  { id: "mobility", short: "MOB", label: "Mobility" },
  { id: "balance", short: "BAL", label: "Balance" },
  { id: "agility", short: "AGI", label: "Agility & Reaction" },
]
const DOMAIN_BY_ID = new Map(DOMAINS.map((d) => [d.id, d]))

export interface LogEntry {
  slug: FullSlug
  /** Calendar date, YYYY-MM-DD */
  date: string
  /** Days since 1970-01-01 for `date` */
  epochDay: number
  title: string
  tags: string[]
  duration?: number
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

export function isLogSlug(slug: string | undefined): slug is FullSlug {
  return !!slug && slug.startsWith(`${LOG_FOLDER}/`) && !slug.endsWith("index")
}

function isoDateOf(file: QuartzPluginData): string | undefined {
  const fm = (file.frontmatter ?? {}) as Record<string, unknown>
  for (const key of ["created", "date", "published"]) {
    const value = fm[key]
    if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10)
    if (typeof value === "string" && ISO_DATE.test(value)) return value.slice(0, 10)
  }
  // No filesystem fallback: a note in log/ only counts as a day when it says which day it is.
  return file.slug?.split("/").pop()?.match(ISO_DATE)?.[0]
}

function isDraft(file: QuartzPluginData): boolean {
  const draft = file.frontmatter?.draft
  return draft === true || draft === "true"
}

const cache = new WeakMap<QuartzPluginData[], LogEntry[]>()

/** Published daily logs, oldest first. */
export function collectLogs(allFiles: QuartzPluginData[]): LogEntry[] {
  const cached = cache.get(allFiles)
  if (cached) return cached

  const logs: LogEntry[] = []
  for (const file of allFiles) {
    if (!isLogSlug(file.slug) || isDraft(file)) continue
    const date = isoDateOf(file)
    if (!date) continue
    const duration = Number(file.frontmatter?.duration)
    logs.push({
      slug: file.slug,
      date,
      epochDay: toEpochDay(date),
      title: file.frontmatter?.title ?? date,
      tags: file.frontmatter?.tags ?? [],
      duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    })
  }
  logs.sort((a, b) => a.epochDay - b.epochDay || a.slug.localeCompare(b.slug))
  cache.set(allFiles, logs)
  return logs
}

/** Day 1 is the date of the first log. */
export function dayNumber(entry: { epochDay: number }, logs: LogEntry[]): number {
  return logs.length === 0 ? 0 : entry.epochDay - logs[0].epochDay + 1
}

export function splitTags(tags: string[]): { domains: Domain[]; other: string[] } {
  const domains: Domain[] = []
  const other: string[] = []
  for (const tag of tags) {
    const domain = DOMAIN_BY_ID.get(tag.toLowerCase())
    if (domain) domains.push(domain)
    else if (tag !== LOG_FOLDER) other.push(tag)
  }
  domains.sort((a, b) => DOMAINS.indexOf(a) - DOMAINS.indexOf(b))
  return { domains, other }
}

/** The first domain tag as written. It picks the day's plant in the garden. */
export function primaryDomain(tags: string[]): Domain | undefined {
  for (const tag of tags) {
    const domain = DOMAIN_BY_ID.get(tag.toLowerCase())
    if (domain) return domain
  }
  return undefined
}
