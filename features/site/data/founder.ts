import type { Founder } from "@/features/site/domain/entities";

/**
 * The founder, for the home page's "Behind the lens" scene. `null` until the
 * owner provides the real details: name as they'd like it shown, their role,
 * a portrait and, if they want, a line in their own words. Until then the
 * scene shows the studio itself (logo + true facts). Nothing here may be
 * invented. Example:
 *
 *   export const founder: Founder | null = {
 *     name: "…", nameNe: "…", role: "Founder & lead photographer",
 *     quote: "…their words…", bio: "…",
 *     photo: { src: "/images/founder/<name>.webp", width: 1200, height: 1500 },
 *   };
 */
export const founder: Founder | null = null;
