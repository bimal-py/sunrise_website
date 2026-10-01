import Image from "next/image";
import { BookImage, Clapperboard, MapPin } from "lucide-react";
import type { SiteSettings } from "@/features/site/domain/entities";
import { routes } from "@/lib/routes";
import { ViewAllLink } from "@/shared/components/ui/view-all-link";

const bracket = "absolute h-6 w-6 border-primary";

/**
 * "Behind the lens": the founder's portrait seen through the viewfinder from
 * the splash (gold autofocus brackets locked on, exposure readouts, a frame
 * number), beside their name, role and own words. Until the founder's details
 * are added (dashboard → Settings → Founder), the frame holds the studio's logo
 * and the text is about the studio: nothing about a person is invented.
 */
export function BehindTheLens({ site, firstYear }: { site: SiteSettings; firstYear?: string }) {
  const { address, founder } = site;
  // "Arjunchaupari-5, Syangja": the address line without the country.
  const place = address.line.split(",").slice(0, 2).join(",").trim() || [address.locality, address.district].filter(Boolean).join(", ");
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
      {/* The viewfinder */}
      <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] border border-line bg-surface">
          {founder?.photo ? (
            <Image
              src={founder.photo.src}
              alt={`${founder.name}, ${founder.role}`}
              fill
              sizes="(min-width: 1024px) 420px, 90vw"
              placeholder={founder.photo.blurDataURL ? "blur" : "empty"}
              blurDataURL={founder.photo.blurDataURL || undefined}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Image src="/brand/logo-480.webp" alt={`${site.name} logo`} width={480} height={480} unoptimized className="w-[62%]" />
            </div>
          )}
          {/* Rule-of-thirds grid, very faint */}
          <span aria-hidden className="absolute inset-x-0 top-1/3 h-px bg-strong/10" />
          <span aria-hidden className="absolute inset-x-0 top-2/3 h-px bg-strong/10" />
          <span aria-hidden className="absolute inset-y-0 left-1/3 w-px bg-strong/10" />
          <span aria-hidden className="absolute inset-y-0 left-2/3 w-px bg-strong/10" />
          {/* Autofocus locked */}
          <span aria-hidden className="absolute inset-[14%]">
            <span className={`${bracket} left-0 top-0 border-l-2 border-t-2`} />
            <span className={`${bracket} right-0 top-0 border-r-2 border-t-2`} />
            <span className={`${bracket} bottom-0 left-0 border-b-2 border-l-2`} />
            <span className={`${bracket} bottom-0 right-0 border-b-2 border-r-2`} />
          </span>
          <p aria-hidden className="absolute left-4 top-4 font-mono text-[10px] tracking-[0.15em] text-strong/70">
            f/1.8 · 85mm · ISO 200
          </p>
          <p aria-hidden className="absolute bottom-4 right-4 font-mono text-[10px] tracking-[0.15em] text-strong/70">
            FRAME 05
          </p>
        </div>
      </div>

      {/* The words */}
      <div>
        {founder ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{founder.role}</p>
            <p className="mt-3 font-display text-[40px] font-semibold leading-tight text-strong sm:text-[48px]">{founder.name}</p>
            {founder.nameNe && (
              <p lang="ne" className="text-muted">
                {founder.nameNe}
              </p>
            )}
            {founder.quote && (
              <blockquote className="mt-8 border-l border-primary pl-6 font-display text-[24px] italic leading-snug text-strong sm:text-[28px]">
                &ldquo;{founder.quote}&rdquo;
              </blockquote>
            )}
            {founder.bio && <p className="mt-6 max-w-xl text-muted">{founder.bio}</p>}
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">The studio</p>
            <p className="mt-3 font-display text-[40px] font-semibold leading-tight text-strong sm:text-[48px]">{site.name}</p>
            <p lang="ne" className="text-muted">
              {site.nameNe}
            </p>
            <p className="mt-8 max-w-xl text-lg text-foreground">{site.studioBlurb}</p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-6 max-w-xl rounded-card border border-dashed border-primary/60 px-4 py-3 font-mono text-xs text-primary">
                Dev only: add the founder&apos;s name, portrait and words in Dashboard → Settings → Founder to show them here.
              </p>
            )}
          </>
        )}

        <ul className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line text-sm sm:grid-cols-3">
          <li className="flex items-center gap-3 bg-background px-4 py-4">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {place}
          </li>
          {firstYear && (
            <li className="flex items-center gap-3 bg-background px-4 py-4">
              <Clapperboard className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              Films since {firstYear}
            </li>
          )}
          <li className="flex items-center gap-3 bg-background px-4 py-4">
            <BookImage className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Printed in the studio
          </li>
        </ul>
        <div className="mt-8">
          <ViewAllLink href={routes.about()}>More about the studio</ViewAllLink>
        </div>
      </div>
    </div>
  );
}
