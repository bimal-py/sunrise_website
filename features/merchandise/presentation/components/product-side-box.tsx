import { MapPin, Phone, ShieldCheck, Store, Truck } from "lucide-react";
import type { SiteSettings } from "@/features/site/domain/entities";
import { whatsappUrl } from "@/lib/config/site";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";

const heading = "font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";
const line = "mt-3 flex items-start gap-2.5 text-sm text-foreground";
const icon = "mt-0.5 h-4 w-4 shrink-0 text-primary";
const contactLink = "flex min-h-9 items-start gap-2.5 py-1.5 text-muted transition-colors duration-150 hover:text-primary";

/**
 * The box beside a product (under its options below xl), as on Daraz: delivery, warranty and
 * returns (the product's own words, or "ask us"), and who sells it: the studio, with call,
 * WhatsApp (about this product) and its address. Studio details come from Settings.
 */
export function ProductSideBox({ deliveryInfo, warrantyInfo, site, whatsappMessage }: { deliveryInfo: string; warrantyInfo: string; site: SiteSettings; whatsappMessage: string }) {
  const { contact, address } = site;
  return (
    <aside aria-label="Delivery and seller" className="h-fit rounded-panel border border-line bg-surface p-5 xl:sticky xl:top-28">
      <section>
        <h2 className={heading}>Delivery</h2>
        <p className={line}>
          <Truck className={icon} aria-hidden />
          <span className="whitespace-pre-line">{deliveryInfo.trim() || "Ask us about delivery and pickup."}</span>
        </p>
      </section>
      <section className="mt-5 border-t border-line pt-5">
        <h2 className={heading}>Warranty &amp; returns</h2>
        <p className={line}>
          <ShieldCheck className={icon} aria-hidden />
          <span className="whitespace-pre-line">{warrantyInfo.trim() || "Ask us."}</span>
        </p>
      </section>
      <section className="mt-5 border-t border-line pt-5">
        <h2 className={heading}>Sold by</h2>
        <p className="mt-3 flex items-center gap-2.5 font-semibold text-strong">
          <Store className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          {site.name}
        </p>
        <ul className="mt-2 flex flex-col text-sm">
          {contact.phoneHref && (
            <li>
              <a href={contact.phoneHref} className={contactLink}>
                <Phone className={icon} aria-hidden />
                Call {contact.phone}
              </a>
            </li>
          )}
          {contact.whatsapp && (
            <li>
              <a href={whatsappUrl(contact.whatsapp, whatsappMessage)} target="_blank" rel="noopener noreferrer" className={contactLink}>
                <WhatsAppIcon className={icon} />
                WhatsApp {contact.whatsappDisplay}
              </a>
            </li>
          )}
          <li>
            <a href={address.mapsUrl} target="_blank" rel="noopener noreferrer" className={contactLink}>
              <MapPin className={icon} aria-hidden />
              {address.line}
            </a>
          </li>
        </ul>
      </section>
    </aside>
  );
}
