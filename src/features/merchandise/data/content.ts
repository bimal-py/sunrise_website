import groq from "groq";

import { fetchSanityOrFallback } from "@/core/sanity/client";

export type MerchandiseItem = {
  title: string;
  category: string;
  summary: string;
  currentPrice: string;
  originalPrice?: string;
  discountLabel?: string;
  availability: string;
  image?: string;
  accent: string;
};

const fallbackMerchandise: MerchandiseItem[] = [
  {
    title: "Premium Photo Album",
    category: "Albums",
    summary:
      "Premium wedding and portrait album with thick pages, elegant cover finishing, and storytelling layouts designed for lasting keepsakes.",
    currentPrice: "Rs. 9,500",
    originalPrice: "Rs. 12,000",
    discountLabel: "21% OFF",
    availability: "Made to order",
    image: "/brand/sunrise-logo.png",
    accent: "gold"
  },
  {
    title: "Framed Portrait Print",
    category: "Frames",
    summary:
      "Display-ready portrait frame with clean mounting, premium finish, and custom presentation for homes, gifts, and studio walls.",
    currentPrice: "Rs. 4,200",
    originalPrice: "Rs. 5,000",
    discountLabel: "Save Rs. 800",
    availability: "Available",
    image: "/brand/sunrise-logo.png",
    accent: "ember"
  },
  {
    title: "Mini Photo Book",
    category: "Keepsakes",
    summary:
      "Compact printed keepsake for engagement shoots, family highlights, and gift-ready memories with a neat premium finish.",
    currentPrice: "Rs. 2,800",
    availability: "Available",
    image: "/brand/sunrise-logo.png",
    accent: "sunrise"
  },
  {
    title: "Canvas Wall Print",
    category: "Wall Art",
    summary:
      "Statement wall print for portraits, wedding frames, maternity sessions, and standout images prepared for display.",
    currentPrice: "Rs. 6,800",
    originalPrice: "Rs. 7,500",
    discountLabel: "Limited offer",
    availability: "Pre-order",
    image: "/brand/sunrise-logo.png",
    accent: "bronze"
  }
];

const merchandiseQuery = groq`*[_type == "merchandiseItem"] | order(featured desc, _createdAt desc){
  title,
  category,
  summary,
  currentPrice,
  originalPrice,
  discountLabel,
  availability,
  "image": image.asset->url,
  accent
}`;

export const getMerchandise = async () =>
  fetchSanityOrFallback<MerchandiseItem[]>(merchandiseQuery, fallbackMerchandise);
