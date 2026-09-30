import Image from "next/image";
import Link from "next/link";
import type { BlogPostPreview } from "@/features/blog/domain/entities";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { AfBrackets } from "@/shared/components/ui/af-brackets";

const chip = "inline-flex items-center rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted";

/**
 * Editorial card: the cover (16:9) with its reading time, then the date, the
 * title, the summary and the topics. The whole card is one link; pointed at,
 * the autofocus brackets snap onto it. `className` sets its width in a
 * carousel.
 */
export function BlogCard({ post, className = "" }: { post: BlogPostPreview; className?: string }) {
  return (
    <article
      className={`af-card group relative flex h-full flex-col rounded-card border border-line bg-surface transition-colors duration-150 hover:border-line-strong ${className}`}
    >
      <AfBrackets />
      <div className="relative overflow-hidden rounded-t-[7px] bg-raised">
        {post.coverImage ? (
          <Image
            src={post.coverImage.src}
            alt={post.coverImage.alt}
            width={post.coverImage.width}
            height={post.coverImage.height}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            placeholder="blur"
            blurDataURL={post.coverImage.blurDataURL}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="aspect-video w-full" />
        )}
        <span className="absolute right-3 top-3 rounded-full border border-line-strong bg-background/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground">
          {post.readingTimeMinutes} min read
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>
        <h3 lang={post.language} className="line-clamp-2 text-[17px] font-semibold leading-snug transition-colors duration-150 group-hover:text-primary">
          {/* Stretched link: the whole card is clickable, one link in the markup. */}
          <Link href={routes.post(post.slug)} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        <p lang={post.language} className="line-clamp-2 text-sm leading-relaxed text-muted">
          {post.summary}
        </p>
        {post.tags.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {post.tags.slice(0, 3).map((tag) => (
              <li key={tag} className={chip}>
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
