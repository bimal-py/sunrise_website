import type { ComponentProps, ReactNode } from "react";
import { compileSafeMdx } from "@/lib/mdx/compile";
import { mdxComponents } from "@/features/blog/presentation/components/mdx-components";
import { paragraphs } from "@/features/site/domain/page-content";

/**
 * The description's own headings sit under the page's "Description" (h2): they start at h3,
 * so a "# Title" in the text never makes a second h1.
 */
const components = {
  ...mdxComponents,
  h1: (props: ComponentProps<"h3">) => <h3 {...props} />,
  h2: (props: ComponentProps<"h3">) => <h3 {...props} />,
  h3: (props: ComponentProps<"h4">) => <h4 {...props} />,
};

/**
 * A product's description (Markdown from the dashboard, with the blog's elements: <Ne>,
 * photos, links). Compiled when the page is built, like a post body (JavaScript and any
 * element off the safe list are removed). A description that doesn't
 * compile as MDX (a stray "<" or "{") falls back to plain Markdown, then to its paragraphs,
 * so a typo never breaks the product page.
 */
export async function ProductDescription({ source }: { source: string }) {
  let content: ReactNode = null;
  for (const format of ["mdx", "md"] as const) {
    try {
      ({ content } = await compileSafeMdx(source, { components, format }));
      break;
    } catch (error) {
      console.warn(`[merchandise] description didn't compile as ${format}:`, error instanceof Error ? error.message : error);
    }
  }
  return (
    <div className="prose-article">
      {content ?? paragraphs(source).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </div>
  );
}
