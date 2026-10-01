import Link from "next/link";
import type { ComponentProps } from "react";

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
  // Post bodies come from the dashboard: elements that could run code or load other pages render nothing.
  script: () => null,
  style: () => null,
  iframe: () => null,
  object: () => null,
  embed: () => null,
  form: () => null,
};
