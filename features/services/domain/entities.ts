import type { Offering } from "@/shared/domain/offering";
import type { FilmCategory } from "@/features/films/domain/entities";

/** Something the studio photographs or films: weddings, pasni, portraits, events. */
export type Service = Offering & {
  /** A couple of words, for lists ("Portraits", "Passport photos"). */
  shortName: string;
  /** One of the (four) services on the home page's shot list. */
  featured: boolean;
  /** A still from the studio's films that shows this kind of shoot (YouTube id); the shot list reveals it on hover. */
  coverFilmId: string | null;
  /** Films of this kind, shown on the service page ("See our work"). */
  filmCategory: FilmCategory | null;
  /** Print products that go with this service (slugs from features/prints). */
  relatedPrints: string[];
};
