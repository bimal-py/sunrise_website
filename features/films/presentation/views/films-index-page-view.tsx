import { Suspense } from "react";
import { routes } from "@/lib/routes";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmCategories } from "@/features/films/domain/entities";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { YouTubeIcon } from "@/shared/components/brand/social-icons";
import { FilterItem, ListFilterSync } from "@/shared/components/filter/list-filter";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { FilmCard } from "../components/film-card";
import { FilmCategoryNav, FilmsEmpty } from "../components/film-filters";

/**
 * Every film, newest first. One static page: ?category= is applied in the browser
 * (see list-filter.tsx), so a filtered view costs no server work and adds no cache entry.
 */
export async function FilmsIndexPageView() {
  const [films, site] = await Promise.all([filmRepository.list(), getSiteSettings()]);
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
          eyebrow="Films"
          title="Wedding and ceremony films"
          titleNe="विवाह तथा संस्कारका भिडियो"
          description="Weddings, pasni, bratabandha and cultural programmes we've filmed across Syangja. New films go up on our YouTube channel first."
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
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {films.map((film) => (
            <FilterItem key={film.id} target={{ group: film.category }} className="min-w-0">
              <FilmCard film={film} />
            </FilterItem>
          ))}
        </div>
      </Container>
    </main>
  );
}
