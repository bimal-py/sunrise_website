import type { Metadata } from "next";
import { ContactPageView } from "@/features/site/presentation/views/contact-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Contact and booking",
    description:
      "Book Sunrise Photo Studio for your wedding, pasni, bratabandha or portraits: WhatsApp, phone, email, and the studio's address in Arjunchaupari, Syangja.",
    path: routes.contact(),
    page: "contact",
  });
}

export default function ContactPage() {
  return <ContactPageView />;
}
