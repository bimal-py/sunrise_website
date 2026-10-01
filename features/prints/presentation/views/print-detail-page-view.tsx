import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/breadcrumbs";
import { serviceJsonLd } from "@/lib/seo/structured-data";
import { redirectOrNotFound } from "@/features/site/data/redirects.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
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

export async function PrintDetailPageView({ slug }: { slug: string }) {
  const print = await printRepository.get(slug);
  if (!print) return redirectOrNotFound(routes.print(slug));
  const [services, others] = await Promise.all([
    serviceRepository.listByPrint(print.slug),
    printRepository.list().then((all) => all.filter((p) => p.slug !== print.slug).slice(0, 3)),
  ]);

  const crumbs: Crumb[] = [
    { label: "Home", href: routes.home() },
    { label: "Prints", href: routes.prints() },
    { label: print.name },
  ];

  return (
    <main>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={serviceJsonLd(await getSiteSettings(), { name: print.name, description: print.summary, path: routes.print(print.slug), serviceType: print.serviceType })} />
      <Container narrow className="pt-8 pb-20">
        <Breadcrumbs crumbs={crumbs} />

        <header className="mt-6 max-w-3xl">
          <OfferingIcon name={print.icon} className="h-6 w-6" />
          <h1 className="mt-4 text-[40px] sm:text-[52px]">{print.name}</h1>
          <p lang="ne" className="mt-1 text-lg text-foreground">
            {print.nameNe}
          </p>
          <p className="mt-4 text-lg text-muted">{print.summary}</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="order-last min-w-0 lg:order-none">
            <OfferingArticle intro={print.intro} sections={print.sections} faqs={print.faqs}>
              {print.options.length > 0 && (
                <section>
                  <h2>{print.optionsHeading}</h2>
                  <table>
                    <tbody>
                      {print.options.map((option) => (
                        <tr key={option.label}>
                          <th scope="row">{option.label}</th>
                          <td className="text-muted">{option.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </OfferingArticle>
          </div>
          <InquiryCard
            title="Ask for a quote"
            message={print.inquiry}
            note="Prices depend on size, paper and frame stock, so we quote each order. Send us the photo and the size you want."
          />
        </div>

        {services.length > 0 && (
          <section aria-labelledby="services-heading" className="mt-16 border-t border-line pt-10">
            <SectionHeading id="services-heading" eyebrow="Goes with" title="Shoots we print this for" action={<ViewAllLink href={routes.services()}>All services</ViewAllLink>} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.slice(0, 3).map((service) => (
                <OfferingCard key={service.slug} offering={service} href={routes.service(service.slug)} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="more-prints" className="mt-16 border-t border-line pt-10">
          <SectionHeading id="more-prints" eyebrow="Prints and albums" title="More to print" action={<ViewAllLink href={routes.prints()}>All prints</ViewAllLink>} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <OfferingCard key={other.slug} offering={other} href={routes.print(other.slug)} meta={other.highlight} />
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
