import Link from "next/link";
import { siteConfig } from "@/lib/config/site";
import { routes } from "@/lib/routes";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";

/** Plain-language privacy notice. Keep it true: update it whenever analytics, forms or embeds change. */
export function PrivacyPageView() {
  return (
    <main>
      <Container narrow className="pt-10 pb-20">
        <SectionHeading as="h1" eyebrow="Privacy" title="Privacy notice" description="Last updated 27 September 2026." />
        <div className="prose-article max-w-3xl">
          <p>
            {siteConfig.name}&apos;s website has no accounts or logins, doesn&apos;t use analytics or advertising trackers, and
            doesn&apos;t sell data. This page explains the little that happens when you use it.
          </p>
          <h2>The enquiry form</h2>
          <p>
            The form on the <Link href={routes.contact()}>contact page</Link> doesn&apos;t send or store anything on this
            website. It opens WhatsApp, or your email app, with your message written out, and you choose whether to send it.
            Once you do, the conversation is between you and us on that service, under its own privacy policy.
          </p>
          <h2>Films</h2>
          <p>
            Film pages show our own preview image. YouTube&apos;s player only loads when you press play, and it uses
            YouTube&apos;s privacy-enhanced mode (youtube-nocookie.com). Once it plays, YouTube&apos;s privacy policy applies.
          </p>
          <h2>Hosting</h2>
          <p>Like every website, our host keeps standard server logs (such as IP address and the page requested) for security and reliability.</p>
          <h2>Links to other services</h2>
          <p>Links to WhatsApp, Facebook, YouTube and Google Maps take you to those services, which have their own privacy policies.</p>
          <h2>Photos of you</h2>
          <p>
            If you appear in a photo or film on this website or our channels and would like it removed, tell us and we&apos;ll
            take it down.
          </p>
          <h2>Contact</h2>
          <p>
            Questions or requests: <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.
          </p>
        </div>
      </Container>
    </main>
  );
}
