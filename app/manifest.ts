import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/features/site/data/settings.repository";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSiteSettings();
  return {
    name: site.name,
    short_name: "Sunrise Studio",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#101011",
    theme_color: "#101011",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/logo-512.jpg", sizes: "512x512", type: "image/jpeg" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
