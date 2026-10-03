import { ArrowDown, ArrowUpRight } from "lucide-react";
import { whatsappUrl } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { localBusinessJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";
import { filmRepository } from "@/features/films/data/films.repository";
import { printRepository } from "@/features/prints/data/prints.repository";
import { reviewRepository } from "@/features/reviews/data/reviews.repository";
import { ReviewCard } from "@/features/reviews/presentation/components/review-card";
import { serviceRepository } from "@/features/services/data/services.repository";
import { getPage } from "@/features/site/data/pages.repository";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { getSocialLinks } from "@/features/site/data/social-links.repository";
import { pageCopy } from "@/features/site/domain/page-content";
import { isOwnWhatsappChat } from "@/features/site/domain/social-link";
import { SocialLinkIcon, WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { SunriseMark } from "@/shared/components/brand/sunrise-mark";
import { JsonLd } from "@/shared/components/seo/json-ld";
import { Container } from "@/shared/components/ui/container";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";
import { Carousel } from "@/shared/components/ui/carousel";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { BehindTheLens } from "../components/behind-the-lens";
import { DarkroomWall } from "../components/darkroom-wall";
import { FilmLight } from "../components/film-light";
import { FilmStrip } from "../components/film-strip";
import { PendantLamp } from "../components/pendant-lamp";
import { Safelight } from "../components/safelight";
import { SceneHeading } from "../components/scene-heading";
import { SceneLink } from "../components/scene-link";
import { ShotList } from "../components/shot-list";
import { Slate } from "../components/slate";
import { SplashScreen } from "../components/splash-screen";

const section = "py-16 lg:py-20";
// A lit scene (globals.css "Scene lights"): its light sits in a layer behind the content.
const litSection = "relative isolate";

/**
 * Home. After the full-screen intro, the page is told as a short film in
 * numbered scenes, each with its own photographic device:
 *   01 Now showing: the films as a 35mm film strip you scroll sideways
 *   02 The shot list: the services as a director's shot list, stills develop on hover
 *   03 From the darkroom: the prints as objects hanging on a drying line
 *   04 Kind words: reviews, notched cards with a lens monogram (only once real reviews exist)
 *   05 Behind the lens: the founder in the splash's viewfinder (the studio until added)
 *   06 Book a date: a clapperboard slate that claps as it scrolls in
 * Scenes 01–03 are lit like sets as they come into view: a pendant lamp over
 * the film strip, a film light on the shot list, a red safelight in the
 * darkroom.
 * Featured items only; everything else lives on each section's page. Section
 * ids match `navItems` (lib/constants/navigation.ts), which scrolls to them.
 */
export async function HomePageView() {
  const [reel, allFilms, services, allServices, prints, reviews, site, page, socialLinks] = await Promise.all([
    filmRepository.listHighlights(8),
    filmRepository.list(),
    serviceRepository.list({ featured: true }),
    serviceRepository.list(),
    printRepository.list(),
    reviewRepository.list(),
    getSiteSettings(),
    getPage("home"),
    getSocialLinks(),
  ]);
  // The scenes' titles and ledes (dashboard → Pages → Home); the headline is a studio setting.
  const copy = pageCopy("home", page.content, site);
  const otherServices = allServices.filter((service) => !service.featured);
  // Only prints with a mock-up hang on the darkroom line.
  const hanging = prints.filter((print) => print.mockup);
  // Film stills by YouTube id, for the shot list and the darkroom mock-ups.
  const stills = Object.fromEntries(allFilms.filter((film) => film.thumbnail).map((film) => [film.id, film.thumbnail!]));
  const firstYear = allFilms.at(-1)?.publishedAt.slice(0, 4);
  const { address, contact, social } = site;
  const bookingMessage = `Hello ${site.name}, I'd like to ask about booking. The date is: `;
  // Scenes are numbered in page order; "Kind words" only exists once there are reviews.
  const scenes = ["films", "services", "prints", ...(reviews.length > 0 ? ["reviews"] : []), "about", "contact"];
  const sceneOf = (id: string) => scenes.indexOf(id) + 1;

  return (
    <main>
      <JsonLd data={websiteJsonLd(site)} />
      <JsonLd data={localBusinessJsonLd(site, socialLinks)} />
      <SplashScreen heroMarkSelector=".hero-mark" tagline={site.tagline} signature={`${site.name}, ${address.district}`} />

      {/* ── Home: the whole first screen. The splash's sun lands on its mark. ── */}
      <section id="home" className="relative flex min-h-[100svh] items-center lg:-mt-20">
        {/* Even space above and below: the block sits in the middle of the screen under the nav. */}
        <Container className="py-16">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <SunriseMark id="hero" strokeWidth={7} className="hero-mark w-14" />
            {/* hero-reveal: hidden while the splash plays, faded in as its sun lands on the mark above. */}
            <div className="hero-reveal flex w-full flex-col items-center">
              {/* Visible gaps (measured, the serif carries extra space): sun + name 14 · name → headline 28 ·
                  headline → Nepali 20 · message → buttons 40 · buttons → icons 24. Groups: signature, message, actions. */}
              <p className={`mt-2 ${eyebrowClasses}`}>
                {site.name} · {address.district}
                <span className="hidden sm:inline">, {address.country}</span>
              </p>
              <h1 className="mt-[18px] text-balance text-[34px] leading-[1.1] sm:text-[44px] lg:text-[52px]">{site.tagline}</h1>
              {site.taglineNe && (
                <p lang="ne" className="mt-5 text-base text-muted sm:text-lg">
                  {site.taglineNe}
                </p>
              )}
              {/* Phones: stacked and centred at their natural width, the films button compact. */}
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
                <SpriteButton href={whatsappUrl(contact.whatsapp, bookingMessage)}>
                  <WhatsAppIcon className="h-4 w-4" /> Book on WhatsApp
                </SpriteButton>
                <SpriteButton href="/#films" variant="secondary" className="sprite-btn-compact">
                  Watch our films
                </SpriteButton>
              </div>
              {/* Social profiles, as on the owner's portfolio: plain icons, no boxes (Settings → Social links), then WhatsApp. */}
              <ul className="mt-3 flex flex-wrap items-center justify-center gap-3">
                {[
                  ...socialLinks
                    .filter((link) => !isOwnWhatsappChat(link, contact.whatsapp))
                    .map((link) => ({ key: link.id, label: link.label, href: link.url, icon: <SocialLinkIcon platform={link.platform} iconSvg={link.iconSvg} /> })),
                  ...(contact.whatsapp ? [{ key: "whatsapp", label: "WhatsApp", href: whatsappUrl(contact.whatsapp), icon: <WhatsAppIcon className="h-5 w-5" /> }] : []),
                ].map(({ key, label, href, icon }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex size-11 items-center justify-center text-muted transition-colors duration-150 hover:text-primary"
                    >
                      {icon}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
        <a
          href="#films"
          className="hero-reveal absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-muted transition-colors duration-150 hover:text-primary lg:flex"
        >
          Scroll <ArrowDown className="scroll-cue-arrow h-4 w-4" strokeWidth={1.5} aria-hidden />
        </a>
      </section>

      {/* ── The rest of the page is told in scenes (see SceneHeading). ── */}
      {/* The lamp hangs in the extra room above the title card. */}
      <section id="films" aria-labelledby="films-heading" className={`${litSection} pb-16 pt-30 lg:pb-20 lg:pt-40`}>
        <PendantLamp />
        <Container>
          <SceneHeading
            scene={sceneOf("films")}
            id="films-heading"
            title={copy.filmsTitle}
            lede={copy.filmsLede}
          />
        </Container>
        <FilmStrip films={reel} total={allFilms.length} center={
            <SceneLink href={routes.films()} besideArrows>
              View all {allFilms.length} films
            </SceneLink>
          } />
      </section>

      <section id="services" aria-labelledby="services-heading" className={`${litSection} ${section}`}>
        <FilmLight />
        <Container>
          <SceneHeading
            scene={sceneOf("services")}
            id="services-heading"
            title={copy.servicesTitle}
            lede={copy.servicesLede}
          />
          <ShotList services={services} others={otherServices} stills={stills} />
          <div className="mt-12 flex justify-center">
            <SceneLink href={routes.services()}>View all {allServices.length} services</SceneLink>
          </div>
        </Container>
      </section>

      <section id="prints" aria-labelledby="prints-heading" className={`${litSection} ${section}`}>
        <Safelight />
        <Container>
          <SceneHeading
            scene={sceneOf("prints")}
            id="prints-heading"
            title={copy.printsTitle}
            lede={copy.printsLede}
          />
        </Container>
        <DarkroomWall
          prints={hanging}
          stills={stills}
          center={
            <SceneLink href={routes.prints()} besideArrows>
              View all prints and albums
            </SceneLink>
          }
        />
      </section>

      {reviews.length > 0 && (
        <section id="reviews" aria-labelledby="reviews-heading" className={section}>
          <Container>
            <SceneHeading scene={sceneOf("reviews")} id="reviews-heading" title={copy.reviewsTitle} lede={copy.reviewsLede} />
          </Container>
          <Carousel
            label="Reviews"
            center={
              social.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Review us on Facebook <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
              )
            }
          >
            {reviews.map((review, index) => (
              <ReviewCard key={`${review.name}-${index}`} review={review} />
            ))}
          </Carousel>
        </section>
      )}

      <section id="about" aria-labelledby="about-heading" className={section}>
        <Container>
          <SceneHeading scene={sceneOf("about")} id="about-heading" title={copy.aboutTitle} lede={copy.aboutLede || undefined} />
          <BehindTheLens site={site} firstYear={firstYear} />
        </Container>
      </section>

      <section id="contact" aria-labelledby="contact-heading" className={section}>
        <Container>
          <SceneHeading scene={sceneOf("contact")} id="contact-heading" title={copy.contactTitle} lede={copy.contactLede} />
          <Slate scene={sceneOf("contact")} site={site} socialLinks={socialLinks} />
        </Container>
      </section>
    </main>
  );
}
