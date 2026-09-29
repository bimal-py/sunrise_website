import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Play } from "lucide-react";
import type { Film } from "@/features/films/domain/entities";
import { filmCategoryLabel } from "@/features/films/domain/entities";
import { routes } from "@/lib/routes";
import { Carousel } from "@/shared/components/ui/carousel";

const month = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "Asia/Kathmandu" });

/** One row of sprocket holes. The strip's frames sit edge to edge, so the rows join into one film. */
function Perforations({ code }: { code?: string }) {
  return (
    <div className="film-perforations relative h-7">
      {code && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-[#171718] pr-2 font-mono text-[9px] tracking-[0.2em] text-primary/80">{code}</span>
      )}
    </div>
  );
}

/**
 * "Now showing": the studio's films as a strip of 35mm film you scroll
 * sideways. Each frame has sprocket holes above and below, an edge print like
 * real film stock (SUNRISE 400 ▸ 01A), the still, and its caption. The strip
 * ends with an "end of roll" frame that leads to every film. With a mouse, the
 * stills rest a little dim and the frame you point at tears out of the strip:
 * the film splits either side of it and it comes closer (globals.css "Film
 * strip"). The article is the frame's fixed slot and takes the hover; the
 * piece inside it is what moves, so a torn edge never slips out from under the
 * pointer.
 */
export function FilmStrip({ films, total, center }: { films: Film[]; total: number; center?: ReactNode }) {
  return (
    <Carousel label="Films" gap="gap-0" center={center} className="film-strip">
      {films.map((film, index) => (
        <article key={film.id} className="film-frame group relative w-[78vw] shrink-0 snap-start sm:w-[380px] lg:w-[420px]">
          <div className="film-piece relative">
            <Perforations code={`SUNRISE 400  ▸ ${String(index + 1).padStart(2, "0")}A`} />
            <div className="px-3">
              <div className="relative overflow-hidden rounded-[3px] bg-black">
                {film.thumbnail && (
                  <Image
                    src={film.thumbnail.src}
                    alt=""
                    width={film.thumbnail.width}
                    height={film.thumbnail.height}
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 360px, 78vw"
                    placeholder="blur"
                    blurDataURL={film.thumbnail.blurDataURL}
                    className="film-still aspect-[3/2] w-full object-cover"
                  />
                )}
                <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-primary">
                  <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 pt-3">
                <h3 className="truncate text-[15px] font-semibold text-strong group-hover:text-primary">
                  <Link href={routes.film(film.slug)} className="after:absolute after:inset-0">
                    {film.title}
                  </Link>
                </h3>
                <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  {filmCategoryLabel(film.category).split(" ")[0]} · <time dateTime={film.publishedAt}>{month.format(new Date(film.publishedAt))}</time>
                </p>
              </div>
            </div>
            <Perforations />
          </div>
        </article>
      ))}

      {/* End of roll: the last frame leads to all films. */}
      <article className="film-frame group relative flex w-[60vw] shrink-0 snap-start sm:w-[280px]">
        <div className="film-piece relative flex flex-1 flex-col">
          <Perforations code="END OF ROLL" />
          <div className="flex flex-1 flex-col items-start justify-end px-6 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{total} films on the reel</p>
            <p className="mt-2 font-display text-[28px] leading-tight text-strong group-hover:text-primary">
              <Link href={routes.films()} className="after:absolute after:inset-0">
                See every film
              </Link>
            </p>
            <ArrowRight className="mt-3 h-5 w-5 text-primary" aria-hidden />
          </div>
          <Perforations />
        </div>
      </article>
    </Carousel>
  );
}
