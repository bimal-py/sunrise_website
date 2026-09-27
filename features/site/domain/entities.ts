/** The person behind the studio, shown in the home page's "Behind the lens" scene. */
export type Founder = {
  name: string;
  nameNe?: string;
  /** "Founder & lead photographer". */
  role: string;
  /** Their own words, a sentence or two (never written for them). */
  quote?: string;
  /** A short third-person line about them: since when, what they shoot. Facts only. */
  bio?: string;
  /** A real portrait in /public (e.g. "/images/founder/mahendra.webp"), portrait orientation, ≥ 800px wide. */
  photo?: { src: string; width: number; height: number };
};
