import type { ReactNode } from "react";
import Link from "next/link";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { pageBody, pageCopy, paragraphs } from "@/features/site/domain/page-content";
import { routes } from "@/lib/routes";
import { filmRepository } from "@/features/films/data/films.repository";
import { printRepository } from "@/features/prints/data/prints.repository";
import { serviceRepository } from "@/features/services/data/services.repository";
import { InquiryCard } from "@/shared/components/content/inquiry-card";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";

/** The intro's first paragraph: the studio's name in bold when it opens with it. */
function withStudioName(text: string, name: string): ReactNode {
  if (!name || !text.startsWith(name)) return text;
  return (
    <>
      <strong>{name}</strong>
      {text.slice(name.length)}
    </>
  );
}

export async function AboutPageView() {
  const site = await getSiteSettings();
  const [services, prints, films, page] = await Promise.all([serviceRepository.list(), printRepository.list(), filmRepository.list(), getPage("about")]);
  const firstYear = films.at(-1)?.publishedAt.slice(0, 4);
  // The header and the introduction (dashboard → Pages → About); the sections below are built from the content.
  const copy = pageCopy("about", page.content, site);
  const intro = paragraphs(pageBody("about", page.body, site));

  return (
    <main>
      <Container narrow className="pt-10 pb-20">
        <SectionHeading as="h1" eyebrow={copy.eyebrow} title={copy.title} titleNe={copy.titleNe} />
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="prose-article">
            {intro.map((text, index) =>
              index === 0 ? (
                <p key={index} className="text-lg">
                  {withStudioName(text, site.name)}
                </p>
              ) : (
                <p key={index}>{text}</p>
              ),
            )}

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
