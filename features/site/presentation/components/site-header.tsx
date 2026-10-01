import { whatsappUrl } from "@/lib/config/site";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { FloatingNav } from "@/shared/components/navigation/floating-nav";

/**
 * Site header, as on the owner's portfolio: no bar and no logo, just the
 * floating nav (a pill at the top on desktop, a dock at the bottom on mobile).
 * The desktop spacer keeps page content below the fixed pill; the home hero
 * pulls itself up under it (`lg:-mt-20`) to fill the whole first screen.
 */
export async function SiteHeader() {
  const { name, contact } = await getSiteSettings();
  return (
    <header>
      <div aria-hidden className="hidden h-20 lg:block" />
      <FloatingNav
        contact={{
          phone: contact.phone,
          phoneHref: contact.phoneHref,
          bookingHref: whatsappUrl(contact.whatsapp, `Hello ${name}, I'd like to ask about booking.`),
          whatsappHref: whatsappUrl(contact.whatsapp),
        }}
      />
    </header>
  );
}
