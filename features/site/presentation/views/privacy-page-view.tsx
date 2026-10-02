import Link from "next/link";
import { getSiteSettings } from "@/features/site/data/settings.repository";
import { routes } from "@/lib/routes";
import { Container } from "@/shared/components/ui/container";
import { SectionHeading } from "@/shared/components/ui/section-heading";

/** Plain-language privacy notice. Keep it true: update it whenever analytics, forms or embeds change. */
export async function PrivacyPageView() {
  const site = await getSiteSettings();
  return (
    <main>
      <Container narrow className="pt-10 pb-20">
        <SectionHeading as="h1" eyebrow="Privacy" title="Privacy notice" description="Last updated 3 October 2026." />
        <div className="prose-article max-w-3xl">
          <p>
            {site.name}&apos;s website asks you to sign up for nothing, doesn&apos;t use advertising trackers, and doesn&apos;t sell
            data. Only the studio signs in, to look after the site. This page explains what happens when you use it.
          </p>
          <h2>The enquiry form</h2>
          <p>
            When you send the form on the <Link href={routes.contact()}>contact page</Link>, we keep what you wrote (your
            name, phone number, email if you give one, the occasion, date, place and message) and when you sent it, so we can
            reply. It&apos;s stored in our database (Supabase) and only the studio can read it. To stop the form being misused we
            also keep a scrambled code made from your connection&apos;s address, which can&apos;t be turned back into the address. Ask
            us and we&apos;ll delete your message. If you message us on WhatsApp instead, that conversation is under
            WhatsApp&apos;s own privacy policy.
          </p>
          {site.clarityId && (
            <>
              <h2>Visitor statistics</h2>
              <p>
                We use Microsoft Clarity to see how people use this website (which pages they read, where they click and how far
                they scroll), so we can make it easier to use. It sets cookies, records visits without your name, and hides what
                you type into forms. Microsoft&apos;s privacy statement applies to that data. Most browsers let you block these
                cookies.
              </p>
            </>
          )}
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
            Questions or requests: <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
          </p>
        </div>
      </Container>
    </main>
  );
}
