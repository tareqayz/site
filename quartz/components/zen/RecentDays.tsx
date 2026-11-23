import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { FullSlug, resolveRelative } from "../../util/path"
import { collectLogs, dayNumber, handDate, LOG_FOLDER, padDay } from "./lib/log"

interface Options {
  title: string
  limit: number
}

const defaultOptions: Options = {
  title: "recent days",
  limit: 5,
}

/** The latest daily logs, newest first, with handwritten dates (left sidebar). */
export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const RecentDays: QuartzComponent = ({
    fileData,
    allFiles,
    displayClass,
  }: QuartzComponentProps) => {
    const logs = collectLogs(allFiles)
    const here = fileData.slug!
    const recent = logs.slice(-opts.limit).reverse()

    return (
      <div class={classNames(displayClass, "zen-recent")}>
        <h3>{opts.title}</h3>
        {recent.length === 0 ? (
          <p class="zen-hand zen-recent-empty">the first day is coming.</p>
        ) : (
          <ul>
            {recent.map((log) => (
              <li>
                <a
                  class="internal"
                  href={resolveRelative(here, log.slug)}
                  aria-current={log.slug === here ? "page" : undefined}
                >
                  <span class="zen-recent-title">{log.title}</span>
                  <span class="zen-recent-date zen-hand">
                    day {padDay(dayNumber(log, logs))} · {handDate(log.date, { weekday: false })}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {logs.length > opts.limit && (
          <a
            class="internal zen-more"
            href={resolveRelative(here, `${LOG_FOLDER}/index` as FullSlug)}
          >
            all {logs.length} days →
          </a>
        )}
      </div>
    )
  }

  return RecentDays
}) satisfies QuartzComponentConstructor<Partial<Options> | undefined>
