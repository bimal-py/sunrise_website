import { whatsappUrl } from "@/lib/config/site";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { pageCopy } from "@/features/site/domain/page-content";
import { routes } from "@/lib/routes";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { printRepository } from "@/features/prints/data/prints.repository";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { OfferingCard } from "@/shared/components/content/offering-card";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";

export async function PrintsIndexPageView() {
  const [prints, site, page] = await Promise.all([printRepository.list(), getSiteSettings(), getPage("prints")]);
  // The header and the "How to order" steps (dashboard → Pages → Prints).
  const copy = pageCopy("prints", page.content);
  const steps = [
    { title: copy.step1Title, body: copy.step1Body },
    { title: copy.step2Title, body: copy.step2Body },
    { title: copy.step3Title, body: copy.step3Body },
  ];

  return (
    <main>
      <JsonLd data={itemListJsonLd("Prints and albums", prints.map((p) => ({ name: p.name, path: routes.print(p.slug) })))} />
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow={copy.eyebrow}
          title={copy.title}
          titleNe={copy.titleNe}
          description={copy.lede}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {prints.map((print) => (
            <OfferingCard key={print.slug} offering={print} href={routes.print(print.slug)} meta={print.highlight} />
          ))}
        </div>

        <section aria-labelledby="order-heading" className="mt-20 border-t border-line pt-14">
          <SectionHeading
            id="order-heading"
            eyebrow="How to order"
            title="From your phone to your wall"
            action={
              <SpriteButton href={whatsappUrl(site.contact.whatsapp, `Hello ${site.name}, I'd like to order a print.`)}>
                <WhatsAppIcon className="h-4 w-4" /> Order on WhatsApp
              </SpriteButton>
            }
          />
          <ol className="grid border-t border-line md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={index} className="border-b border-line py-6 md:border-b-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0">
                <p className="font-mono text-xs text-primary">0{index + 1}</p>
                <h3 className="mt-2 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </Container>
    </main>
  );
}
