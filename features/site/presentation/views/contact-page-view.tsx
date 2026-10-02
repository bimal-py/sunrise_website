import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { lineItems, pageCopy } from "@/features/site/domain/page-content";
import { localBusinessJsonLd } from "@/lib/seo/structured-data";
import { FacebookIcon, WhatsAppIcon, YouTubeIcon } from "@/shared/components/brand/social-icons";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { BookingForm } from "../components/booking-form";

type Channel = { icon: ReactNode; label: string; value: string; href: string; external?: boolean };

export async function ContactPageView() {
  const [site, page] = await Promise.all([getSiteSettings(), getPage("contact")]);
  const { contact, address, social } = site;
  // The header, the visit note and the checklist (dashboard → Pages → Contact).
  const copy = pageCopy("contact", page.content);
  const channels: Channel[] = [
    { icon: <WhatsAppIcon className="h-5 w-5" />, label: "WhatsApp", value: contact.whatsappDisplay, href: whatsappUrl(contact.whatsapp), external: true },
    { icon: <Phone className="h-5 w-5" aria-hidden />, label: "Call", value: contact.phone, href: contact.phoneHref },
    { icon: <Mail className="h-5 w-5" aria-hidden />, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { icon: <FacebookIcon className="h-5 w-5" />, label: "Facebook", value: site.name, href: social.facebook, external: true },
    { icon: <YouTubeIcon className="h-5 w-5" />, label: "YouTube", value: "Our films", href: social.youtube, external: true },
  ].filter((channel) => channel.href && channel.value);

  return (
    <main>
      <JsonLd data={localBusinessJsonLd(site)} />
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow={copy.eyebrow}
          title={copy.title}
          titleNe={copy.titleNe}
          description={copy.lede}
        />

        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-8">
            <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
              {channels.map((channel) => (
                <li key={channel.label}>
                  <a
                    href={channel.href}
                    {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-raised"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-primary">{channel.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">{channel.label}</span>
                      <span className="block truncate font-medium text-strong group-hover:text-primary">{channel.value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <section aria-labelledby="visit-heading" className="rounded-panel border border-line bg-surface p-6">
              <h2 id="visit-heading" className="font-sans text-lg font-semibold">
                Visit the studio
              </h2>
              <p className="mt-3 flex items-start gap-2.5 text-muted">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>
                  {address.street}, {address.district}, {address.region}, {address.country}
                  <span lang="ne" className="block">
                    {address.lineNe}
                  </span>
                </span>
              </p>
              <a
                href={address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block py-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open in Google Maps
              </a>
              <p className="mt-3 text-sm text-muted">{copy.visitNote}</p>
            </section>
          </div>

          <div className="min-w-0">
            <BookingForm studioName={site.name} whatsapp={contact.whatsapp} />
            <section aria-labelledby="include-heading" className="mt-8">
              <h2 id="include-heading" className="font-sans text-base font-semibold">
                What to include in your message
              </h2>
              <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                {lineItems(copy.include).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </Container>
    </main>
  );
}
