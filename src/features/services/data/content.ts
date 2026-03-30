import groq from "groq";

import { fetchSanityOrFallback } from "@/core/sanity/client";

export type ServiceItem = {
  title: string;
  summary: string;
  priceLabel: string;
  turnaround: string;
  highlights: string[];
};

const fallbackServices: ServiceItem[] = [
  {
    title: "Wedding Photography And Films",
    summary:
      "Full-day, half-day, or custom wedding coverage with guided portraits, ceremony documentation, candid storytelling, and refined color finishing.",
    priceLabel: "Custom wedding quote",
    turnaround: "Based on selected package",
    highlights: ["Bride and groom portraits", "Ceremony and reception coverage", "Album and highlight film options"]
  },
  {
    title: "Portrait And Family Sessions",
    summary:
      "Studio and outdoor portrait sessions for individuals, couples, families, children, maternity, and graduation memories.",
    priceLabel: "Starts from inquiry",
    turnaround: "Flexible scheduling available",
    highlights: ["Studio and natural light setups", "Guided posing and direction", "Retouched final images"]
  },
  {
    title: "Event Coverage",
    summary:
      "Reliable photo and short-form video coverage for birthdays, engagements, pujas, receptions, corporate functions, and community events.",
    priceLabel: "Flexible event quote",
    turnaround: "Based on event scale",
    highlights: ["On-location studio team", "Fast preview selects", "Social-ready highlight delivery"]
  },
  {
    title: "Passport, Visa, And Instant Photos",
    summary:
      "Fast and clean in-studio service for passports, visas, identification cards, job applications, and official documents.",
    priceLabel: "Walk-in friendly",
    turnaround: "Same day",
    highlights: ["Standard compliant sizes", "Quick turnaround", "Sharp and professional finish"]
  }
];

const servicesQuery = groq`*[_type == "service"] | order(_createdAt desc){
  title,
  summary,
  priceLabel,
  turnaround,
  highlights
}`;

export const getServices = async () =>
  fetchSanityOrFallback<ServiceItem[]>(servicesQuery, fallbackServices);
