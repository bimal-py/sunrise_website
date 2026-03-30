import type { ResolvedSiteConfig } from "@/core/config/site";

export const buildContactContent = (siteConfig: ResolvedSiteConfig) => ({
  intro:
    "Use WhatsApp, phone, email, Facebook, or the inquiry form below to ask about bookings, portrait sessions, event coverage, reels, passport photos, and merchandise orders.",
  inquiryTopics: [
    "Wedding booking",
    "Portrait session",
    "Passport or instant photo",
    "Event coverage",
    "Merchandise order",
    "Video or reel package"
  ],
  whatsappLink: `https://wa.me/${siteConfig.whatsapp}?text=Hello%20${encodeURIComponent(siteConfig.name)},%20I%20want%20to%20ask%20about%20your%20services.`,
  phoneLink: `tel:${siteConfig.phone}`,
  emailLink: `mailto:${siteConfig.email}`,
  formAction: `https://formsubmit.co/${siteConfig.email}`
});
