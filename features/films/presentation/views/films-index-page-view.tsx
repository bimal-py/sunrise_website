import Link from "next/link";
import { siteConfig } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmCategories, type FilmCategory } from "@/features/films/domain/entities";
import { YouTubeIcon } from "@/shared/components/brand/social-icons";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { Container } from "@/shared/components/ui/container";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { FilmCard } from "../components/film-card";

const chip = "inline-flex h-9 shrink-0 items-center rounded-control border px-3 text-sm transition-colors duration-150";

export async function FilmsIndexPageView({ category }: { category?: FilmCategory }) {
  const [films, all] = await Promise.all([filmRepository.list({ category }), filmRepository.list()]);
  const counts = new Map(filmCategories.map((c) => [c.slug, all.filter((f) => f.category === c.slug).length]));

  return (
    <main>
      {!category && <JsonLd data={itemListJsonLd("Films by Sunrise Photo Studio", films.map((f) => ({ name: f.title, path: routes.film(f.slug) })))} />}
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow="Films"
          title="Wedding and ceremony films"
          titleNe="विवाह तथा संस्कारका भिडियो"
          description="Weddings, pasni, bratabandha and cultural programmes we've filmed across Syangja. New films go up on our YouTube channel first."
          action={
            <SpriteButton href={siteConfig.social.youtube} variant="secondary">
              <YouTubeIcon className="h-4 w-4" /> YouTube channel
            </SpriteButton>
          }
        />

        <nav aria-label="Film categories" className="-mx-4 mb-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {[
              { label: `All (${all.length})`, href: routes.films(), active: !category },
              ...filmCategories.map((c) => ({ label: `${c.label} (${counts.get(c.slug)})`, href: routes.filmCategory(c.slug), active: category === c.slug })),
            ].map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`${chip} ${item.active ? "border-primary bg-primary-soft text-strong" : "border-line-strong text-foreground hover:border-primary"}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {films.length === 0 ? (
          <EmptyState title="No films here yet">New films are on the way. Our YouTube channel has everything we&apos;ve published.</EmptyState>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {films.map((film) => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
