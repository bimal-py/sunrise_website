import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/breadcrumbs";
import { serviceJsonLd } from "@/lib/seo/structured-data";
import { filmRepository } from "@/features/films/data/films.repository";
import { filmCategoryLabel } from "@/features/films/domain/entities";
import { FilmCard } from "@/features/films/presentation/components/film-card";
import { printRepository } from "@/features/prints/data/prints.repository";
import { serviceRepository } from "@/features/services/data/services.repository";
import { InquiryCard } from "@/shared/components/content/inquiry-card";
import { OfferingArticle } from "@/shared/components/content/offering-article";
import { OfferingCard } from "@/shared/components/content/offering-card";
import { OfferingIcon } from "@/shared/components/content/offering-icon";
import { Breadcrumbs } from "@/shared/components/navigation/breadcrumbs";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { ViewAllLink } from "@/shared/components/ui/view-all-link";

export async function ServiceDetailPageView({ slug }: { slug: string }) {
  const service = await serviceRepository.get(slug);
  if (!service) notFound();
  const [films, prints] = await Promise.all([
    service.filmCategory ? filmRepository.list({ category: service.filmCategory, limit: 3 }) : Promise.resolve([]),
    printRepository.listBySlugs(service.relatedPrints),
  ]);

  const crumbs: Crumb[] = [
    { label: "Home", href: routes.home() },
    { label: "Services", href: routes.services() },
    { label: service.name },
  ];

  return (
    <main>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={serviceJsonLd({ name: service.name, description: service.summary, path: routes.service(service.slug), serviceType: service.serviceType })} />
      <Container narrow className="pt-8 pb-20">
        <Breadcrumbs crumbs={crumbs} />

        <header className="mt-6 max-w-3xl">
          <OfferingIcon name={service.icon} className="h-6 w-6" />
          <h1 className="mt-4 text-[40px] sm:text-[52px]">{service.name}</h1>
          <p lang="ne" className="mt-1 text-lg text-foreground">
            {service.nameNe}
          </p>
          <p className="mt-4 text-lg text-muted">{service.summary}</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="order-last min-w-0 lg:order-none">
            <OfferingArticle intro={service.intro} sections={service.sections} faqs={service.faqs} />
          </div>
          <InquiryCard title={`Ask about ${service.name.toLowerCase()}`} message={service.inquiry} />
        </div>

        {service.filmCategory && films.length > 0 && (
          <section aria-labelledby="work-heading" className="mt-16 border-t border-line pt-10">
            <SectionHeading
              id="work-heading"
              eyebrow="Our work"
              title={`Recent ${filmCategoryLabel(service.filmCategory).toLowerCase()} films`}
              action={<ViewAllLink href={routes.filmCategory(service.filmCategory)}>All {filmCategoryLabel(service.filmCategory).toLowerCase()}</ViewAllLink>}
            />
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {films.map((film) => (
                <FilmCard key={film.id} film={film} />
              ))}
            </div>
          </section>
        )}

        {prints.length > 0 && (
          <section aria-labelledby="prints-heading" className="mt-16 border-t border-line pt-10">
            <SectionHeading id="prints-heading" eyebrow="Keep it" title="Prints that go with it" action={<ViewAllLink href={routes.prints()}>All prints</ViewAllLink>} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {prints.map((print) => (
                <OfferingCard key={print.slug} offering={print} href={routes.print(print.slug)} meta={print.highlight} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}
