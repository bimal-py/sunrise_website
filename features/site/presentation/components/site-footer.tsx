import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { navItems } from "@/lib/constants/navigation";
import { routes } from "@/lib/routes";
import { serviceRepository } from "@/features/services/data/services.repository";
import { printRepository } from "@/features/prints/data/prints.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { Logo } from "@/shared/components/brand/logo";
import { FacebookIcon, WhatsAppIcon, YouTubeIcon } from "@/shared/components/brand/social-icons";
import { Container } from "@/shared/components/ui/container";

const heading = "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary";
const link = "inline-block py-1.5 text-muted transition-colors duration-150 hover:text-primary";
const round = "flex size-10 items-center justify-center rounded-full border border-line-strong text-foreground transition-colors duration-150 hover:border-primary hover:text-primary";

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const [services, prints, site] = await Promise.all([serviceRepository.list(), printRepository.list(), getSiteSettings()]);
  const { contact, address, social } = site;

  return (
    // pb-28 below lg: room for the mobile dock so it never covers the copyright line.
    <footer className="mt-auto border-t border-line bg-surface pb-28 lg:pb-0">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Logo size="lg" />
          <p className="max-w-sm text-sm text-muted">
            {site.footerBlurb}
          </p>
          <div className="flex gap-2">
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={round}>
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
            {social.youtube && (
              <a href={social.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={round}>
                <YouTubeIcon className="h-4 w-4" />
              </a>
            )}
            {contact.whatsapp && (
              <a href={whatsappUrl(contact.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={round}>
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <nav aria-label="Services">
          <h2 className={heading}>Services</h2>
          <ul className="mt-3 flex flex-col text-sm">
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={routes.service(service.slug)} className={link}>
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-8">
          <nav aria-label="Prints">
            <h2 className={heading}>Prints</h2>
            <ul className="mt-3 flex flex-col text-sm">
              {prints.map((print) => (
                <li key={print.slug}>
                  <Link href={routes.print(print.slug)} className={link}>
                    {print.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Explore">
            <h2 className={heading}>Explore</h2>
            <ul className="mt-3 flex flex-col text-sm">
              {navItems
                .filter((item) => ["films", "blog", "about", "contact"].includes(item.id))
                .map((item) => (
                  <li key={item.id}>
                    <Link href={item.route} className={link}>
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>

        <div>
          <h2 className={heading}>Visit or call</h2>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <a href={address.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-0.5 text-muted hover:text-primary">
                {address.line}
                <span lang="ne" className="block">
                  {address.lineNe}
                </span>
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <a href={contact.phoneHref} className="inline-block py-0.5 text-muted hover:text-primary">
                {contact.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <WhatsAppIcon className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <a href={whatsappUrl(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-block py-0.5 text-muted hover:text-primary">
                {contact.whatsappDisplay}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <a href={`mailto:${contact.email}`} className="inline-block break-all py-0.5 text-muted hover:text-primary">
                {contact.email}
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col gap-1 py-5 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.name} · <span lang="ne">{site.nameNe}</span>
          </p>
          <p>
            Website by{" "}
            <a href={site.author.url} className="inline-block py-1 font-medium text-foreground hover:text-primary">
              {site.author.name}
            </a>{" "}
            ·{" "}
            <Link href={routes.privacy()} className="inline-block py-1 hover:text-primary">
              Privacy
            </Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}
