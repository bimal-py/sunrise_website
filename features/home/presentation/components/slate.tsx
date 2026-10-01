import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/features/site/domain/entities";
import { whatsappUrl } from "@/lib/config/site";
import { FacebookIcon, WhatsAppIcon, YouTubeIcon } from "@/shared/components/brand/social-icons";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { Clapper } from "./clapper";

const fieldLabel = "font-mono text-[10px] uppercase tracking-[0.2em] text-muted";
const social =
  "flex size-11 items-center justify-center rounded-full border border-line-strong text-foreground transition-colors duration-150 hover:border-primary hover:text-primary";

/**
 * "Book a date" as a film slate (clapperboard): striped clapper sticks in gold
 * and black, and a board with the production's details, where the client's
 * day is the production and the studio is behind the camera. The top stick
 * claps once as it scrolls into view. Then the ways to book.
 */
export function Slate({ scene, site }: { scene: number; site: SiteSettings }) {
  const { contact, address, social: socials } = site;
  const message = `Hello ${site.name}, I'd like to book a date. The occasion is: `;
  return (
    <div className="mx-auto max-w-3xl pt-6">
      <Clapper />
      <div aria-hidden className="slate-stripes slate-stripes-offset h-10 border-y border-black sm:h-12" />
      <div className="rounded-b-panel border border-t-0 border-line-strong bg-surface">
        <dl className="grid grid-cols-3 border-b border-line">
          <div className="col-span-3 border-b border-line p-5 sm:p-6">
            <dt className={fieldLabel}>Production</dt>
            <dd className="mt-2 font-display text-[26px] leading-tight text-strong sm:text-[32px]">Your wedding, pasni or bratabandha</dd>
          </div>
          <div className="col-span-3 border-b border-line p-5 sm:col-span-2 sm:border-b-0 sm:border-r sm:p-6">
            <dt className={fieldLabel}>Behind the camera</dt>
            <dd className="mt-2 text-lg text-strong">{site.name}</dd>
          </div>
          <div className="col-span-3 grid grid-cols-3 sm:col-span-1 sm:grid-cols-1">
            <div className="border-r border-line p-5 sm:border-b sm:border-r-0 sm:p-6">
              <dt className={fieldLabel}>Date</dt>
              <dd className="mt-2 text-strong">Yours</dd>
            </div>
            <div className="border-r border-line p-5 sm:hidden">
              <dt className={fieldLabel}>Scene</dt>
              <dd className="mt-2 font-mono text-strong">{String(scene).padStart(2, "0")}</dd>
            </div>
            <div className="p-5 sm:hidden">
              <dt className={fieldLabel}>Take</dt>
              <dd className="mt-2 font-mono text-strong">01</dd>
            </div>
          </div>
        </dl>

        <div className="p-5 sm:p-8">
          <p className="max-w-lg text-muted">
            Send us the occasion, the date and the place. We&apos;ll tell you if we&apos;re free and what it would cost.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <SpriteButton href={whatsappUrl(contact.whatsapp, message)}>
              <WhatsAppIcon className="h-4 w-4" /> Book on WhatsApp
            </SpriteButton>
            <SpriteButton href={contact.phoneHref} variant="secondary">
              <Phone className="h-4 w-4" aria-hidden /> {contact.phone}
            </SpriteButton>
          </div>
          <div className="mt-8 flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-col gap-2 text-sm text-muted">
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 py-0.5 hover:text-primary">
                  <Mail className="h-4 w-4 text-primary" aria-hidden /> {contact.email}
                </a>
              </li>
              <li>
                <a href={address.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-0.5 hover:text-primary">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden /> {address.line}
                </a>
              </li>
            </ul>
            <div className="flex gap-2">
              {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={social}>
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
              {socials.youtube && (
                <a href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={social}>
                  <YouTubeIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
