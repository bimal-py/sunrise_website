import Link from "next/link";
import type { ComponentProps } from "react";

/** Pre-built widths of a site photo ("…/<name>.webp" → "…/<name>-800.webp"), or null for any other image. */
function photoSrcSet(src: string): string | null {
  const match = /^(.*\/(?:storage\/v1\/object\/public\/media\/[a-z0-9-]+|images\/(?:blog|films)))\/([A-Za-z0-9_-]+)\.webp$/.exec(src);
  // A pasted size file ("…-1280.webp") is already a real file: show it as it is.
  if (!match || /-(480|800|1280)$/.test(match[2])) return null;
  return [480, 800, 1280].map((w) => `${match[1]}/${match[2]}-${w}.webp ${w}w`).join(", ");
}

/**
 * Element overrides for post bodies. Typography lives in `.prose-article`
 * (globals.css); only behaviour belongs here — internal links go through
 * next/link, external ones open in a new tab.
 */
export const mdxComponents = {
  a: ({ href = "", ...props }: ComponentProps<"a">) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href} {...props} />
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
    ),
  /** Inline Nepali: <Ne>विद्यालय</Ne> — sets lang so the Devanagari font applies. */
  Ne: (props: ComponentProps<"span">) => <span lang="ne" {...props} />,
  /** Photos in a post (inserted from the dashboard): the right pre-built size, loaded lazily. */
  img: ({ src, alt = "" }: ComponentProps<"img">) => {
    if (typeof src !== "string" || !src) return null;
    const srcSet = photoSrcSet(src);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- width/height aren't known in MDX; pre-built sizes via srcSet
      <img src={srcSet ? src.replace(/\.webp$/, "-1280.webp") : src} srcSet={srcSet ?? undefined} sizes="(min-width: 1024px) 760px, 100vw" alt={alt} loading="lazy" decoding="async" className="h-auto w-full rounded-card" />
    );
  },
  // A second wall: lib/mdx/remark-safe-jsx.ts already removes these (overrides only reach Markdown's own elements).
  script: () => null,
  style: () => null,
  iframe: () => null,
  object: () => null,
  embed: () => null,
  form: () => null,
};
