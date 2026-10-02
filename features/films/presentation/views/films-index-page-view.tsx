import { Suspense } from "react";
import { routes } from "@/lib/routes";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmCategories } from "@/features/films/domain/entities";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { pageCopy } from "@/features/site/domain/page-content";
import { YouTubeIcon } from "@/shared/components/brand/social-icons";
import { ListFilterSync } from "@/shared/components/filter/list-filter";
import { PagedGrid } from "@/shared/components/filter/paged-grid";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { FilmCard } from "../components/film-card";
import { FilmCategoryNav, FilmsEmpty } from "../components/film-filters";

/** Films per "page" of the grid (4 rows of 3); more appear as you scroll. */
const PAGE_SIZE = 12;

/**
 * Every film, newest first. One static page: ?category= is applied in the browser
 * (see list-filter.tsx), so a filtered view costs no server work and adds no cache entry.
 */
export async function FilmsIndexPageView() {
  const [films, site, page] = await Promise.all([filmRepository.list(), getSiteSettings(), getPage("films")]);
  const copy = pageCopy("films", page.content);
  const counts = Object.fromEntries(filmCategories.map((c) => [c.slug, films.filter((f) => f.category === c.slug).length]));

  return (
    <main>
      <JsonLd data={itemListJsonLd(`Films by ${site.name}`, films.map((f) => ({ name: f.title, path: routes.film(f.slug) })))} />
      <Suspense fallback={null}>
        <ListFilterSync />
      </Suspense>
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow={copy.eyebrow}
          title={copy.title}
          titleNe={copy.titleNe}
          description={copy.lede}
          action={
            site.social.youtube ? (
              <SpriteButton href={site.social.youtube} variant="secondary">
                <YouTubeIcon className="h-4 w-4" /> YouTube channel
              </SpriteButton>
            ) : undefined
          }
        />

        <FilmCategoryNav total={films.length} categories={filmCategories.map((c) => ({ slug: c.slug, label: c.label, count: counts[c.slug] }))} />
        <FilmsEmpty total={films.length} counts={counts} />
        <PagedGrid targets={films.map((film) => ({ group: film.category }))} pageSize={PAGE_SIZE} noun="films" className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {films.map((film) => (
            <FilmCard key={film.id} film={film} />
          ))}
        </PagedGrid>
      </Container>
    </main>
  );
}
