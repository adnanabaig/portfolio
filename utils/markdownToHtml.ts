import { remark } from "remark";
import html from "remark-html";
import type { Root, Heading } from "mdast";

/**
 * Pages own the h1, so every markdown heading moves down one level
 * (# becomes h2, ## becomes h3, and so on, capped at h6).
 */
function shiftHeadings() {
  return (tree: Root) => {
    const visit = (node: Root | Root["children"][number]) => {
      if (node.type === "heading") {
        const heading = node as Heading;
        heading.depth = Math.min(heading.depth + 1, 6) as Heading["depth"];
      }
      if ("children" in node) node.children.forEach((child) => visit(child as Root["children"][number]));
    };
    visit(tree);
  };
}

export default async function markdownToHtml(markdown: string) {
  const result = await remark().use(shiftHeadings).use(html).process(markdown);
  return result.toString();
}

export function readingMinutes(markdown: string) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 225));
}
