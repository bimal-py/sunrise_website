import "server-only";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { remarkSafeJsx } from "./remark-safe-jsx";

type Components = Record<string, unknown>;
type Options = { components?: Components; format?: "mdx" | "md"; slugs?: boolean; frontmatter?: boolean };

/**
 * The only way the app compiles MDX (posts, product descriptions, the dashboard preview):
 * JavaScript is stripped and only safe elements and attributes survive (remarkSafeJsx), so
 * text from the dashboard can't run code on the site. `slugs` gives headings ids ("On this page").
 */
export function compileSafeMdx<TFrontmatter = Record<string, unknown>>(
  source: string,
  { components, format = "mdx", slugs = false, frontmatter = false }: Options = {},
) {
  return compileMDX<TFrontmatter>({
    source,
    components: components as never,
    options: {
      parseFrontmatter: frontmatter,
      blockJS: true,
      blockDangerousJS: true,
      mdxOptions: { format, remarkPlugins: [remarkGfm, remarkSafeJsx], rehypePlugins: slugs ? [rehypeSlug] : [] },
    },
  });
}

/** The useful line of a compile error (next-mdx-remote puts a generic header first). */
export function mdxErrorDetail(error: unknown): string {
  const lines = (error instanceof Error ? error.message : "")
    .split("\n")
    .map((line) => line.replace(/^\[next-mdx-remote\][^:]*:?/, "").trim())
    .filter(Boolean);
  return (lines[0] ?? "it couldn't be read").replace(/\.$/, "").slice(0, 200);
}

/**
 * Checks text before it's saved: a formatting problem (a stray "<", an unclosed tag) or
 * elements the site won't show (<script>, <iframe>, <form>…), so the author can fix them
 * instead of finding them silently gone. `what` names the text ("The post text").
 */
export async function checkSafeMdx(source: string, what: string): Promise<string | null> {
  if (!source.trim()) return null;
  const removed = new Set<string>();
  try {
    await compileMDX({ source, options: { blockJS: true, blockDangerousJS: true, mdxOptions: { remarkPlugins: [remarkGfm, [remarkSafeJsx, { removed }]] } } });
  } catch (error) {
    return `${what} has a formatting problem: ${mdxErrorDetail(error)}. (A “<” must start a tag like <Ne>…</Ne>; write “less than” otherwise.)`;
  }
  if (removed.size) {
    const names = [...removed].slice(0, 5).map((name) => `<${name}>`).join(", ");
    return `${what} uses ${names}, which the site doesn't show (only text, links, photos, lists, tables and <Ne>…</Ne>). Remove it and save again.`;
  }
  return null;
}
