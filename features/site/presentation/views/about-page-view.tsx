import Link from "next/link";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { routes } from "@/lib/routes";
import { filmRepository } from "@/features/films/data/films.repository";
import { printRepository } from "@/features/prints/data/prints.repository";
import { serviceRepository } from "@/features/services/data/services.repository";
import { InquiryCard } from "@/shared/components/content/inquiry-card";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";

export async function AboutPageView() {
  const site = await getSiteSettings();
  const [services, prints, films] = await Promise.all([serviceRepository.list(), printRepository.list(), filmRepository.list()]);
  const firstYear = films.at(-1)?.publishedAt.slice(0, 4);

  return (
    <main>
      <Container narrow className="pt-10 pb-20">
        <SectionHeading as="h1" eyebrow="About" title={`About ${site.name}`} titleNe={site.nameNe} />
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="prose-article">
            <p className="text-lg">
              <strong>{site.name}</strong> is a photo and film studio in Arjunchaupari, Syangja. We photograph and film
              weddings, pasni, bratabandha, pujas and cultural programmes across the district, from Arjunchaupari to Panchamul,
              Walling and Tirasi, and we print what we shoot: albums, frames, canvas prints and everyday photos.
            </p>
            <p>
              Most of our work is for families: the days they&apos;ll want to see again, and relatives in Nepal and abroad
              will want to watch. That&apos;s why we film every ritual in order, make sure every side of the family gets its
              group photo, and turn the best pictures into things people keep on a shelf or a wall.
            </p>

            <h2>What we do</h2>
            <ul>
              {services.map((service) => (
                <li key={service.slug}>
                  <Link href={routes.service(service.slug)}>{service.name}</Link>: {service.summary.charAt(0).toLowerCase() + service.summary.slice(1)}
                </li>
              ))}
            </ul>

            <h2>Printed in the studio</h2>
            <p>
              Photos shouldn&apos;t stay on a phone. We make{" "}
              {prints.map((print, index) => (
                <span key={print.slug}>
                  {index > 0 && (index === prints.length - 1 ? " and " : ", ")}
                  <Link href={routes.print(print.slug)}>{print.name.toLowerCase()}</Link>
                </span>
              ))}
              , from our own shoots or from photos you bring in.
            </p>

            <h2>Where to see our work</h2>
            <p>
              {firstYear ? `We've been publishing our films on YouTube since ${firstYear}. ` : ""}
              Watch them on our <Link href={routes.films()}>films page</Link> or on our{" "}
              <a href={site.social.youtube}>YouTube channel</a>, and follow new work on our{" "}
              <a href={site.social.facebook}>Facebook page</a>.
            </p>
          </div>
          <InquiryCard title="Visit or get in touch" message={`Hello ${site.name}, I'd like to ask about `} note={`${site.address.line}. WhatsApp is the quickest way to reach us.`} />
        </div>
      </Container>
    </main>
  );
}
