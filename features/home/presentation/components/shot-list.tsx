import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { FilmImage } from "@/features/films/domain/entities";
import type { Service } from "@/features/services/domain/entities";
import { routes } from "@/lib/routes";

const shot = (n: number) => `Shot ${String(n).padStart(2, "0")}`;
const corner = "absolute h-3.5 w-3.5 border-primary";

/**
 * "The shot list": the services, in two forms from one markup.
 *
 * Phones: a storyboard. Each service is a panel: its still full width with
 * small gold viewfinder corners and "SHOT 01" stamped on it, then the title,
 * the Nepali name and the note, with room to read.
 *
 * Desktop (lg+): a director's shot list. Numbered rows, serif titles, a note
 * column; hovering a row develops the still into view on the right.
 *
 * Both end with an "And many more" entry for the services not listed.
 */
export function ShotList({ services, stills, others }: { services: Service[]; stills: Record<string, FilmImage>; others: Service[] }) {
  const label = "font-mono text-[10px] uppercase tracking-[0.2em] text-muted";
  return (
    <div>
      <div className={`hidden grid-cols-[64px_1.2fr_1fr_180px] gap-6 border-b border-line-strong pb-3 lg:grid ${label}`} aria-hidden>
        <span>No.</span>
        <span>Subject</span>
        <span>Notes</span>
        <span className="text-right">Still</span>
      </div>
      <ol className="flex flex-col gap-5 lg:gap-0">
        {services.map((service, index) => {
          const still = service.coverFilmId ? stills[service.coverFilmId] : undefined;
          return (
            <li
              key={service.slug}
              className="group relative overflow-hidden rounded-card border border-line bg-surface lg:overflow-visible lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent"
            >
              <div className="flex flex-col lg:grid lg:grid-cols-[64px_1.2fr_1fr_180px] lg:items-start lg:gap-6 lg:py-8">
                <span className="hidden pt-3.5 font-mono text-xs text-primary lg:block">{String(index + 1).padStart(2, "0")}</span>

                {/* The still: a storyboard frame on phones; on desktop it floats at the row's right edge and develops on hover. */}
                {still && (
                  <div className="relative order-first aspect-[16/9] w-full lg:pointer-events-none lg:absolute lg:right-0 lg:top-1/2 lg:order-none lg:aspect-[3/2] lg:w-[180px] lg:-translate-y-1/2 lg:opacity-0 lg:transition-opacity lg:duration-300 lg:group-hover:opacity-100">
                    <Image
                      src={still.src}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 180px, 100vw"
                      placeholder="blur"
                      blurDataURL={still.blurDataURL}
                      className="object-cover lg:rounded-[3px]"
                    />
                    <span aria-hidden className="absolute inset-3 lg:hidden">
                      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
                      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
                      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
                      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
                    </span>
                    <span className="absolute left-6 top-6 bg-black/65 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-strong lg:hidden">
                      {shot(index + 1)}
                    </span>
                  </div>
                )}

                <div className="min-w-0 p-5 pb-0 lg:p-0">
                  <h3 className="font-display text-[28px] font-semibold leading-tight transition-colors duration-150 group-hover:text-primary sm:text-[32px]">
                    <Link href={routes.service(service.slug)} className="after:absolute after:inset-0">
                      {service.name}
                    </Link>
                  </h3>
                  <p lang="ne" className="mt-1 text-sm text-muted">
                    {service.nameNe}
                  </p>
                </div>
                <p className="px-5 pb-5 pt-3 text-[15px] leading-relaxed text-muted lg:p-0 lg:pt-2 lg:text-sm">{service.summary}</p>
                <span className="flex items-center gap-1.5 border-t border-line px-5 py-3.5 text-sm font-medium text-primary lg:hidden">
                  Details <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
                <ArrowUpRight
                  className="absolute right-0 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted transition-opacity duration-300 lg:block lg:group-hover:opacity-0"
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
        {others.length > 0 && (
          // The list goes on: one more entry for everything not listed above.
          <li className="rounded-card border border-dashed border-line-strong p-5 lg:grid lg:grid-cols-[64px_1fr] lg:items-baseline lg:gap-6 lg:rounded-none lg:border-0 lg:border-b lg:border-solid lg:border-line lg:px-0 lg:py-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary lg:text-xs lg:normal-case lg:tracking-normal">
              <span className="lg:hidden">{shot(services.length + 1)}</span>
              <span className="hidden lg:inline">{String(services.length + 1).padStart(2, "0")}</span>
            </span>
            <p className="mt-2 text-muted lg:mt-0">
              <span className="font-display text-[24px] text-strong sm:text-[26px]">And many more</span>
              <span className="mt-1 block text-sm lg:ml-3 lg:mt-0 lg:inline">{others.map((s) => s.shortName.toLowerCase()).join(", ")}</span>
            </p>
          </li>
        )}
      </ol>
    </div>
  );
}
