import type { Offering } from "@/shared/domain/offering";

/** One row of a print's options table: a size or a finish, and what it's good for. */
export type PrintOption = { label: string; detail: string };

/** A printed product: albums, frames, canvas, prints, photo books. */
export type Print = Offering & {
  /** One of the (three) prints shown on the home page. */
  featured: boolean;
  /** Stills (YouTube ids of the studio's films) shown inside this print's mock-up on the home page. */
  previewFilmIds: string[];
  /** Short fact for cards, e.g. "5×7 to 20×30 in". */
  highlight: string;
  /** Sizes or finishes, shown as a table. Empty when the product is made to order. */
  options: PrintOption[];
  optionsHeading: string;
};
