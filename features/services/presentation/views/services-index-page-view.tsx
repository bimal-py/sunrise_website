import Link from "next/link";
import { routes } from "@/lib/routes";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { printRepository } from "@/features/prints/data/prints.repository";
import { serviceRepository } from "@/features/services/data/services.repository";
import { getPage } from "@/features/site/data/pages.repository";
import { pageCopy } from "@/features/site/domain/page-content";
import { OfferingCard } from "@/shared/components/content/offering-card";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { ViewAllLink } from "@/shared/components/ui/view-all-link";

export async function ServicesIndexPageView() {
  const [services, prints, page] = await Promise.all([serviceRepository.list(), printRepository.list(), getPage("services")]);
  const copy = pageCopy("services", page.content);

  return (
    <main>
      <JsonLd data={itemListJsonLd("Services", services.map((s) => ({ name: s.name, path: routes.service(s.slug) })))} />
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow={copy.eyebrow}
          title={copy.title}
          titleNe={copy.titleNe}
          description={copy.lede}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <OfferingCard key={service.slug} offering={service} href={routes.service(service.slug)} />
          ))}
        </div>

        <section aria-labelledby="prints-heading" className="mt-20 border-t border-line pt-14">
          <SectionHeading
            id="prints-heading"
            eyebrow="After the shoot"
            title="Albums, frames and prints"
            description="We print in the studio, so your photos don't stay on a phone."
            action={<ViewAllLink href={routes.prints()}>All prints</ViewAllLink>}
          />
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {prints.map((print) => (
              <li key={print.slug} className="border-b border-line">
                <Link href={routes.print(print.slug)} className="flex items-baseline justify-between gap-4 py-4 transition-colors duration-150 hover:text-primary">
                  <span className="font-medium text-strong">{print.name}</span>
                  <span className="shrink-0 text-sm text-muted">{print.highlight}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </main>
  );
}
