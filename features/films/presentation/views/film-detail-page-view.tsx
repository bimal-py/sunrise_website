import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteSettings } from "@/features/site/domain/entities";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { redirectOrNotFound } from "@/features/site/data/redirects.repository";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/breadcrumbs";
import { absoluteUrl } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils/date";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmCategoryLabel, type Film } from "@/features/films/domain/entities";
import { filmCategoryService, filmDescription } from "@/features/films/domain/labels";
import { YouTubeIcon } from "@/shared/components/brand/social-icons";
import { InquiryCard } from "@/shared/components/content/inquiry-card";
import { Breadcrumbs } from "@/shared/components/navigation/breadcrumbs";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Badge } from "@/shared/components/ui/badge";
import { Container } from "@/shared/components/ui/container";
import { FilmCard } from "../components/film-card";
import { YouTubePlayer } from "../components/youtube-player";

/** 7113 → "PT1H58M33S" (schema.org durations are ISO 8601). */
function isoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s || (!h && !m) ? `${s}S` : ""}`;
}

function videoJsonLd(film: Film, site: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: film.title,
    description: filmDescription(film, site.name),
    uploadDate: film.publishedAt,
    ...(film.durationSeconds ? { duration: isoDuration(film.durationSeconds) } : {}),
    ...(film.thumbnail ? { thumbnailUrl: [absoluteUrl(film.thumbnail.ogImage)] } : {}),
    embedUrl: film.embedUrl,
    url: absoluteUrl(routes.film(film.slug)),
    publisher: { "@id": absoluteUrl("/#studio"), "@type": "LocalBusiness", name: site.name },
  };
}

export async function FilmDetailPageView({ slug }: { slug: string }) {
  const [film, site] = await Promise.all([filmRepository.get(slug), getSiteSettings()]);
  if (!film) return redirectOrNotFound(routes.film(slug));
  const related = await filmRepository.listRelated(film, 3);
  const about = filmCategoryService[film.category];

  const crumbs: Crumb[] = [
    { label: "Home", href: routes.home() },
    { label: "Films", href: routes.films() },
    { label: film.title },
  ];

  return (
    <main>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={videoJsonLd(film, site)} />
      <Container narrow className="pt-8 pb-20">
        <Breadcrumbs crumbs={crumbs} />

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <article className="min-w-0">
            <Badge tone="primary">{filmCategoryLabel(film.category)}</Badge>
            <h1 className="mt-4 text-[36px] sm:text-[48px]">{film.title}</h1>
            <p className="mt-2 text-sm text-muted">
              Published <time dateTime={film.publishedAt}>{formatDate(film.publishedAt)}</time>
              {film.place && <> · {film.place}, Syangja</>}
            </p>

            <div className="mt-8">
              <YouTubePlayer embedUrl={film.embedUrl} title={film.title} thumbnail={film.thumbnail} />
            </div>

            <div className="prose-article mt-8">
              <p>{filmDescription(film, site.name)}</p>
              <p>
                We photograph and film {about.serviceName} across Syangja. See what&apos;s included on our{" "}
                <Link href={routes.service(about.service)}>{about.serviceName}</Link> page, or browse more{" "}
                <Link href={routes.filmCategory(film.category)}>{filmCategoryLabel(film.category).toLowerCase()} films</Link>.
              </p>
            </div>

            <a
              href={film.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 py-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <YouTubeIcon className="h-4 w-4" /> Watch on YouTube
            </a>
          </article>

          <InquiryCard
            title="Want a film like this?"
            message={`Hello ${site.name}, I watched "${film.title}" on your website and I'd like to ask about booking. Our date is: `}
          />
        </div>

        {related.length > 0 && (
          <section aria-labelledby="more-films" className="mt-16 border-t border-line pt-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="more-films" className="text-[30px]">
                More films
              </h2>
              <Link href={routes.films()} className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
                All films <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <FilmCard key={other.id} film={other} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}
