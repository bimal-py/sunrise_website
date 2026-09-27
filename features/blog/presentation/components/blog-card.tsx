import Image from "next/image";
import Link from "next/link";
import type { BlogPostPreview } from "@/features/blog/domain/entities";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "@/shared/components/ui/badge";

/** Editorial card: photo, tags, title, summary, date. */
export function BlogCard({ post }: { post: BlogPostPreview }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors duration-150 hover:border-primary">
      {post.coverImage && (
        <Image
          src={post.coverImage.src}
          alt={post.coverImage.alt}
          width={post.coverImage.width}
          height={post.coverImage.height}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          placeholder="blur"
          blurDataURL={post.coverImage.blurDataURL}
          className="aspect-[3/2] w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
        <h3 lang={post.language} className="mt-1 text-[17px] font-semibold leading-snug group-hover:text-primary">
          {/* Stretched link: the whole card is clickable, one link in the markup. */}
          <Link href={routes.post(post.slug)} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        <p lang={post.language} className="line-clamp-3 text-sm text-muted">
          {post.summary}
        </p>
        <p className="mt-auto pt-2 text-xs text-muted">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · {post.readingTimeMinutes} min read
        </p>
      </div>
    </article>
  );
}
