import type { Film, FilmCategory } from "./entities";

/** Which service page a film belongs to, and how to describe it in a sentence. */
export const filmCategoryService: Record<FilmCategory, { service: string; serviceName: string; kind: string }> = {
  weddings: { service: "wedding-films", serviceName: "wedding films", kind: "a wedding" },
  ceremonies: { service: "family-ceremonies", serviceName: "family ceremonies", kind: "a family ceremony" },
  culture: { service: "events-and-culture", serviceName: "events and cultural programmes", kind: "a cultural programme" },
};

/** One-sentence description for the film page and its meta description. */
export function filmDescription(film: Film, studioName: string): string {
  const where = film.place ? ` in ${film.place}, Syangja` : "";
  return `${film.title}: ${filmCategoryService[film.category].kind} filmed by ${studioName}${where}. Watch the film here or on our YouTube channel.`;
}
