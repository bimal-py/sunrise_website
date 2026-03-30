import groq from "groq";

import { fetchSanityOrFallback } from "@/core/sanity/client";

export type GalleryItem = {
  title: string;
  category: string;
  summary: string;
  location: string;
  image?: string;
  accent: string;
};

const accentByCategory = (category?: string) => {
  const normalized = category?.toLowerCase() ?? "";

  if (normalized.includes("wedding")) return "sunrise";
  if (normalized.includes("portrait")) return "ember";
  if (normalized.includes("reel")) return "gold";
  if (normalized.includes("family")) return "bronze";
  if (normalized.includes("event")) return "sunrise";
  return "gold";
};

const fallbackGalleryItems: GalleryItem[] = [
  {
    title: "Wedding Story",
    category: "Weddings",
    summary: "Emotion-rich wedding storytelling with elegant portraits, soft color grading, and detail-focused coverage.",
    location: "Across Nepal",
    image: "/brand/sunrise-logo.png",
    accent: "sunrise"
  },
  {
    title: "Studio Portrait Session",
    category: "Portraits",
    summary: "Confident, polished portraits shaped with guided posing, flattering light, and premium retouching.",
    location: "In Studio",
    image: "/brand/sunrise-logo.png",
    accent: "ember"
  },
  {
    title: "Engagement Reel",
    category: "Reels",
    summary: "Short-form visual storytelling designed for social sharing, teaser edits, and memorable couple highlights.",
    location: "Outdoor Session",
    image: "/brand/sunrise-logo.png",
    accent: "gold"
  },
  {
    title: "Family Memory",
    category: "Family",
    summary: "Warm family portraits that preserve togetherness, natural expressions, and milestone moments with care.",
    location: "Studio And Outdoor",
    image: "/brand/sunrise-logo.png",
    accent: "bronze"
  },
  {
    title: "Event Coverage",
    category: "Events",
    summary: "Dependable event photography for celebrations, ceremonies, and gatherings where every key moment matters.",
    location: "On Location",
    image: "/brand/sunrise-logo.png",
    accent: "sunrise"
  },
  {
    title: "Graduation Shoot",
    category: "Celebrations",
    summary: "Clean milestone portraits and lifestyle frames for graduates, achievers, and proud family keepsakes.",
    location: "Campus",
    image: "/brand/sunrise-logo.png",
    accent: "gold"
  }
];

const galleryQuery = groq`*[_type == "galleryItem"] | order(featured desc, _createdAt desc){
  title,
  category,
  summary,
  location,
  "image": image.asset->url
}`;

export const getGalleryItems = async () => {
  const items = await fetchSanityOrFallback<GalleryItem[]>(galleryQuery, fallbackGalleryItems);
  return items.map((item) => ({
    ...item,
    accent: item.accent ?? accentByCategory(item.category)
  }));
};
