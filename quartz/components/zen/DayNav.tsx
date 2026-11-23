import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { resolveRelative } from "../../util/path"
import { collectLogs, dayNumber, isLogSlug, padDay } from "./lib/log"

/** ← day 041 · day 043 → under a daily log. */
export default (() => {
  const DayNav: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
    if (!isLogSlug(fileData.slug)) return null
    const logs = collectLogs(allFiles)
    const index = logs.findIndex((log) => log.slug === fileData.slug)
    if (index < 0) return null

    const here = fileData.slug
    const prev = logs[index - 1]
    const next = logs[index + 1]

    return (
      <nav class={classNames(displayClass, "zen-daynav", "zen-mono")} aria-label="Other days">
        {prev ? (
          <a class="internal zen-daynav-prev" href={resolveRelative(here, prev.slug)} rel="prev">
            ← day {padDay(dayNumber(prev, logs))}
          </a>
        ) : (
          <span class="zen-daynav-edge">the first day</span>
        )}
        <span class="zen-sep" aria-hidden="true">
          ·
        </span>
        {next ? (
          <a class="internal zen-daynav-next" href={resolveRelative(here, next.slug)} rel="next">
            day {padDay(dayNumber(next, logs))} →
          </a>
        ) : (
          <span class="zen-daynav-edge">the latest day</span>
        )}
      </nav>
    )
  }

  return DayNav
}) satisfies QuartzComponentConstructor
