import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig, whatsappUrl } from "@/lib/config/site";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

/**
 * Sidebar on service, print and film pages: how to ask. WhatsApp first (it's
 * how most customers book), then call and email. No prices: every quote is
 * personal, and prices change with stock.
 */
export function InquiryCard({ title, message, note }: { title: string; message: string; note?: string }) {
  const { contact, address } = siteConfig;
  return (
    <aside className="h-fit rounded-panel border border-line bg-surface p-6 lg:sticky lg:top-28">
      <h2 className="font-sans text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">
        {note ?? "Tell us your date, the place and what you need. We'll reply with availability and a quote."}
      </p>
      <SpriteButton href={whatsappUrl(message)} className="mt-5 w-full">
        <WhatsAppIcon className="h-4 w-4" /> Ask on WhatsApp
      </SpriteButton>
      <SpriteButton href={contact.phoneHref} variant="secondary" className="mt-3 w-full">
        <Phone className="h-4 w-4" aria-hidden /> Call {contact.phone}
      </SpriteButton>
      <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-sm text-muted">
        <li className="flex items-start gap-2">
          <Mail className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <a href={`mailto:${contact.email}`} className="inline-block break-all py-0.5 hover:text-primary">
            {contact.email}
          </a>
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <a href={address.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-0.5 hover:text-primary">
            {address.line}
          </a>
        </li>
      </ul>
    </aside>
  );
}
