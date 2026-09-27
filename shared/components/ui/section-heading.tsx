import type { ReactNode } from "react";

type SectionHeadingProps = {
  /** Small gold label above the title: "Services", "From the blog". */
  eyebrow?: string;
  title: ReactNode;
  /** Optional Nepali line directly under the title. */
  titleNe?: string;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
  id?: string;
  /** centre: the home page's sections (title and lede centred, no side action). */
  align?: "start" | "center";
};

export const eyebrowClasses = "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary";

/** Eyebrow + title + optional lede, with an optional action (e.g. "View all") on the right. */
export function SectionHeading({ eyebrow, title, titleNe, description, action, as: Tag = "h2", id, align = "start" }: SectionHeadingProps) {
  if (align === "center") {
    return (
      <div className="mx-auto mb-12 max-w-2xl text-center">
        {eyebrow && <p className={`mb-3 ${eyebrowClasses}`}>{eyebrow}</p>}
        <Tag id={id} className="text-[36px] sm:text-[48px]">
          {title}
        </Tag>
        {description && <p className="mt-3 text-base text-muted">{description}</p>}
      </div>
    );
  }
  return (
    <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className={`mb-3 ${eyebrowClasses}`}>{eyebrow}</p>}
        <Tag id={id} className={Tag === "h1" ? "text-[40px] sm:text-[52px]" : "text-[34px] sm:text-[40px]"}>
          {title}
        </Tag>
        {titleNe && (
          <p lang="ne" className="mt-1 text-base text-foreground">
            {titleNe}
          </p>
        )}
        {description && <p className="mt-3 text-base text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
