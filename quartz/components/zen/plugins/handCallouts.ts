import { Element, Root } from "hast"
import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../../../plugins/types"

const classes = (node: Element): string[] => {
  const value: unknown = node.properties?.className
  if (Array.isArray(value)) return value.map(String)
  return typeof value === "string" ? value.split(" ") : []
}

/**
 * `> [!hand]` callouts are plain handwriting: drop the generated "Hand" title from the HTML so it
 * doesn't leak into link-preview descriptions, search text or screen readers. Must run before the
 * Description transformer (quartz.ts inserts it there).
 */
export const HandCallouts: QuartzTransformerPlugin = () => ({
  name: "ZenHandCallouts",
  htmlPlugins() {
    return [
      () => (tree: Root) => {
        visit(tree, "element", (node: Element) => {
          if (node.properties?.dataCallout !== "hand") return
          node.children = node.children.filter(
            (child) => !(child.type === "element" && classes(child).includes("callout-title")),
          )
        })
      },
    ]
  },
})
