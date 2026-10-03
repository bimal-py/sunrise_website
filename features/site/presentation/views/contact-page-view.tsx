import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { getSocialLinks } from "@/features/site/data/social-links.repository";
import { lineItems, pageCopy } from "@/features/site/domain/page-content";
import { displayUrl, isOwnWhatsappChat, isSocialPlatform, platformLabel, type SocialLink } from "@/features/site/domain/social-link";
import { localBusinessJsonLd } from "@/lib/seo/structured-data";
import { SocialLinkIcon, WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import { BookingForm } from "../components/booking-form";

type Channel = { key: string; icon: ReactNode; label: string; value: string; href: string; external?: boolean };

/** A social link as a channel row: the platform above (or the link's own name, for Website/Other), the link's name or address below. */
function socialChannel(link: SocialLink): Channel {
  const known = isSocialPlatform(link.platform) && link.platform !== "website" && link.platform !== "other";
  // "X (Twitter)" in the dashboard's list; just "X" here.
  const label = known ? platformLabel(link.platform).replace(/\s*\(.*\)$/, "") : link.label;
  const sameAsPlatform = [label, platformLabel(link.platform)].some((name) => name.trim().toLowerCase() === link.label.trim().toLowerCase());
  const value = sameAsPlatform ? displayUrl(link.url) : link.label;
  return { key: link.id, icon: <SocialLinkIcon platform={link.platform} iconSvg={link.iconSvg} />, label, value, href: link.url, external: true };
}

export async function ContactPageView() {
  const [site, page, socialLinks] = await Promise.all([getSiteSettings(), getPage("contact"), getSocialLinks()]);
  const { contact, address } = site;
  // The header, the visit note and the checklist (dashboard → Pages → Contact).
  const copy = pageCopy("contact", page.content);
  // WhatsApp, call and email from the studio's details, then its profiles (Settings → Social links).
  const channels: Channel[] = [
    { key: "whatsapp", icon: <WhatsAppIcon className="h-5 w-5" />, label: "WhatsApp", value: contact.whatsappDisplay, href: contact.whatsapp ? whatsappUrl(contact.whatsapp) : "", external: true },
    { key: "call", icon: <Phone className="h-5 w-5" aria-hidden />, label: "Call", value: contact.phone, href: contact.phoneHref },
    { key: "email", icon: <Mail className="h-5 w-5" aria-hidden />, label: "Email", value: contact.email, href: contact.email ? `mailto:${contact.email}` : "" },
    ...socialLinks.filter((link) => !isOwnWhatsappChat(link, contact.whatsapp)).map(socialChannel),
  ].filter((channel) => channel.href && channel.value);

  return (
    <main>
      <JsonLd data={localBusinessJsonLd(site, socialLinks)} />
      <Container className="pt-10 pb-20">
        <SectionHeading
          as="h1"
          eyebrow={copy.eyebrow}
          title={copy.title}
          titleNe={copy.titleNe}
          description={copy.lede}
        />

        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          {/* min-w-0: a long profile address truncates instead of widening the column on phones. */}
          <div className="flex min-w-0 flex-col gap-8">
            <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
              {channels.map((channel) => (
                <li key={channel.key}>
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
