import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { FullSlug, resolveRelative } from "../../util/path"
import { collectLogs, dayNumber, handDate, isLogSlug, padDay, splitTags } from "./lib/log"

/** "day 042 · mon 24 nov 2026" + [STR] [MOB] domain chips, on daily log pages. */
export default (() => {
  const DayStamp: QuartzComponent = ({
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    if (!isLogSlug(fileData.slug)) return null
    const logs = collectLogs(allFiles)
    const entry = logs.find((log) => log.slug === fileData.slug)
    if (!entry) return null

    const here = fileData.slug
    const { domains, other } = splitTags(entry.tags)
    const tagHref = (tag: string) => resolveRelative(here, `tags/${tag}` as FullSlug)

    return (
      <div class={classNames(displayClass, "zen-daystamp")}>
        <p class="zen-daystamp-day zen-hand">
          day <span class="zen-daystamp-num">{padDay(dayNumber(entry, logs))}</span>
          <span class="zen-sep" aria-hidden="true">
            {" · "}
          </span>
          <time datetime={entry.date}>{handDate(entry.date, { year: true })}</time>
        </p>
        {(domains.length > 0 || other.length > 0 || entry.duration) && (
          <p class="zen-daystamp-meta zen-mono">
            {domains.map((domain) => (
              <a class="internal zen-chip" href={tagHref(domain.id)} title={domain.label}>
                [{domain.short}]
              </a>
            ))}
            {other.map((tag) => (
              <a class="internal zen-tag" href={tagHref(tag)}>
                #{tag}
              </a>
            ))}
            {entry.duration && <span class="zen-duration">{entry.duration} min</span>}
          </p>
        )}
      </div>
    )
  }

  return DayStamp
}) satisfies QuartzComponentConstructor
