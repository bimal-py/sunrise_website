import { whatsappUrl } from "@/lib/config/site";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { routes } from "@/lib/routes";
import { itemListJsonLd } from "@/lib/seo/structured-data";
import { printRepository } from "@/features/prints/data/prints.repository";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { OfferingCard } from "@/shared/components/content/offering-card";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";

const steps = [
  { title: "Send your photos", body: "On WhatsApp as a document (so they aren't compressed), or bring them on a pen drive or memory card." },
  { title: "Choose size and finish", body: "Tell us where it will go and we'll suggest a size, a frame or a canvas, and give you a quote." },
  { title: "Collect it", body: "We print and frame in the studio and let you know when it's ready." },
];

export async function PrintsIndexPageView() {
  const [prints, site] = await Promise.all([printRepository.list(), getSiteSettings()]);

  return (
    <main>
      <JsonLd data={itemListJsonLd("Prints and albums", prints.map((p) => ({ name: p.name, path: routes.print(p.slug) })))} />
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow="Prints and albums"
          title="Albums, frames and prints"
          titleNe="एल्बम, फ्रेम र फोटो प्रिन्ट"
          description="Premium wedding albums, framed portraits, canvas prints, photo books and everyday prints, from our photos or yours."
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
              <li key={step.title} className="border-b border-line py-6 md:border-b-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0">
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
