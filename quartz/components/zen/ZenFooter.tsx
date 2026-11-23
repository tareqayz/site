import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { classNames } from "../../util/lang"
import { pathToRoot } from "../../util/path"

interface Options {
  /** label → absolute URL, or a site path like "index.xml" */
  links: Record<string, string>
  signoff: string
}

const defaultOptions: Options = {
  links: {
    github: "https://github.com/tareqayz",
    rss: "index.xml",
  },
  signoff: "see you tomorrow.",
}

// The sleeping cat from github.com/tareqayz (tareqayz/README.md). Its "ᶻ 𝗓 𐰁" became
// braille blanks so the grid stays even; the z's float above them instead (see .zen-cat-zz).
const CAT_TOP = "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀"
const CAT_EARS = ["⠀⠀⠀⠀⢀⡴⣆⠀⠀⠀⠀⠀⣠⡀", "⠀⠀⠀⠀⠀⠀", "⣼⣿⡗⠀⠀⠀⠀"]
const CAT_BODY = [
  "⠀⠀⠀⣠⠟⠀⠘⠷⠶⠶⠶⠾⠉⢳⡄⠀⠀⠀⠀⠀⣧⣿⠀⠀⠀⠀⠀",
  "⠀⠀⣰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⣤⣤⣤⣤⣤⣿⢿⣄⠀⠀⠀⠀",
  "⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣧⠀⠀⠀⠀⠀⠀⠙⣷⡴⠶⣦",
  "⠀⠀⢱⡀⠀⠉⠉⠀⠀⠀⠀⠛⠃⠀⢠⡟⠀⠀⠀⢀⣀⣠⣤⠿⠞⠛⠋",
  "⣠⠾⠋⠙⣶⣤⣤⣤⣤⣤⣀⣠⣤⣾⣿⠴⠶⠚⠋⠉⠁⠀⠀⠀⠀⠀⠀",
  "⠛⠒⠛⠉⠉⠀⠀⠀⣴⠟⢃⡴⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
  "⠀⠀⠀⠀⠀⠀⠀⠀⠛⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
]

export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const ZenFooter: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const root = pathToRoot(fileData.slug!)
    const href = (target: string) => (/^[a-z]+:/i.test(target) ? target : `${root}/${target}`)
    const year = new Date().getFullYear()

    return (
      <footer class={classNames(displayClass, "zen-footer")}>
        <pre class="zen-cat" aria-hidden="true">
          {CAT_TOP}
          {"\n"}
          {CAT_EARS[0]}
          <span class="zen-cat-zz">
            {CAT_EARS[1]}
            <span class="zen-cat-z zen-cat-z1">z</span>
            <span class="zen-cat-z zen-cat-z2">z</span>
            <span class="zen-cat-z zen-cat-z3">z</span>
          </span>
          {CAT_EARS[2]}
          {"\n"}
          {CAT_BODY.join("\n")}
        </pre>
        <p class="zen-footer-signoff zen-hand">{opts.signoff}</p>
        <ul class="zen-footer-links zen-mono">
          {Object.entries(opts.links).map(([label, target]) => (
            <li>
              <a href={href(target)}>{label}</a>
            </li>
          ))}
        </ul>
        <p class="zen-footer-credit">
          made with <a href="https://quartz.jzhao.xyz">quartz</a> · © {year} tareqayz
        </p>
      </footer>
    )
  }

  return ZenFooter
}) satisfies QuartzComponentConstructor<Partial<Options> | undefined>
