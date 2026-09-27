import type { Metadata } from "next";
import { PrivacyPageView } from "@/features/site/presentation/views/privacy-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy",
  description: "What the Sunrise Photo Studio website collects (very little) and how the enquiry form and film player work.",
  path: routes.privacy(),
});

export default function PrivacyPage() {
  return <PrivacyPageView />;
}
