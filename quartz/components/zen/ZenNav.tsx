import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { FullSlug, resolveRelative } from "../../util/path"

interface Options {
  /** label → target slug (folders end in /index) */
  links: Record<string, string>
}

const defaultOptions: Options = {
  links: {
    "the log": "log/index",
    sources: "sources/index",
    movements: "movements/index",
    about: "about",
  },
}

/** › the log  › sources  › movements  › about */
export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const ZenNav: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const here = fileData.slug!
    return (
      <nav class={classNames(displayClass, "zen-nav", "zen-mono")} aria-label="Sections">
        <ul>
          {Object.entries(opts.links).map(([label, target]) => {
            const section = target.replace(/\/?index$/, "")
            const active = here === target || (section !== "" && here.startsWith(`${section}/`))
            return (
              <li>
                <a
                  class="internal"
                  href={resolveRelative(here, target as FullSlug)}
                  aria-current={active ? "page" : undefined}
                >
                  <span aria-hidden="true">› </span>
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    )
  }

  return ZenNav
}) satisfies QuartzComponentConstructor<Partial<Options> | undefined>
