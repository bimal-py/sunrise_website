import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { filmCategoryLabel, type Film } from "@/features/films/domain/entities";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils/date";
import { AfBrackets } from "@/shared/components/ui/af-brackets";

/** Thumbnail (16:9) → category · date → title. The whole card links to the film's page; pointed at, the autofocus brackets snap onto the thumbnail. */
export function FilmCard({ film, sizes = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" }: { film: Film; sizes?: string }) {
  return (
    <article className="af-card group relative flex h-full flex-col">
      <div className="relative">
        <AfBrackets />
        <div className="relative overflow-hidden rounded-card border border-line bg-surface transition-colors duration-150 group-hover:border-line-strong">
          {film.thumbnail ? (
            <Image
              src={film.thumbnail.src}
              alt=""
              width={film.thumbnail.width}
              height={film.thumbnail.height}
              sizes={sizes}
              placeholder="blur"
              blurDataURL={film.thumbnail.blurDataURL}
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="aspect-video w-full bg-raised" />
          )}
          <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 text-primary">
            <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        {filmCategoryLabel(film.category)} · <time dateTime={film.publishedAt}>{formatDate(film.publishedAt)}</time>
      </p>
      <h3 className="mt-1 text-base font-semibold leading-snug group-hover:text-primary">
        <Link href={routes.film(film.slug)} className="after:absolute after:inset-0">
          {film.title}
        </Link>
      </h3>
    </article>
  );
}
