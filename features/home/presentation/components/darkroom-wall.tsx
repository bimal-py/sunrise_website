import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { FilmImage } from "@/features/films/domain/entities";
import type { Print } from "@/features/prints/domain/entities";
import { Carousel } from "@/shared/components/ui/carousel";
import { routes } from "@/lib/routes";

function Still({ still, sizes, className }: { still?: FilmImage; sizes: string; className: string }) {
  if (!still) return <div className={`bg-raised ${className}`} />;
  return (
    <Image src={still.src} alt="" width={still.width} height={still.height} sizes={sizes} placeholder="blur" blurDataURL={still.blurDataURL} className={`object-cover ${className}`} />
  );
}

/** An open album: two pages of photos with white margins, a gutter down the middle, the cover showing beneath. */
function Album({ stills }: { stills: (FilmImage | undefined)[] }) {
  return (
    <div className="rounded-[3px] bg-[#2a2320] p-1.5 pb-2.5">
      <div className="relative grid grid-cols-2 bg-strong">
        <div className="p-[7%] pr-[5%]">
          <Still still={stills[0]} sizes="(min-width: 1024px) 220px, 42vw" className="aspect-[4/5] w-full" />
        </div>
        <div className="p-[7%] pl-[5%]">
          <Still still={stills[1] ?? stills[0]} sizes="(min-width: 1024px) 220px, 42vw" className="aspect-[4/5] w-full" />
        </div>
        {/* The gutter: a fold line with a soft band either side. */}
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-black/[0.06]" />
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-black/25" />
      </div>
    </div>
  );
}

/** A framed print: a black moulding, a white mat, the photo in the middle. */
function Frame({ still }: { still?: FilmImage }) {
  return (
    <div className="border-[10px] border-[#050505] outline outline-1 outline-line-strong">
      <div className="bg-strong p-[12%]">
        <Still still={still} sizes="(min-width: 1024px) 200px, 60vw" className="aspect-[4/5] w-full object-[45%_50%]" />
      </div>
    </div>
  );
}

/** A canvas: the photo stretched over a frame, its wrapped edge showing on the right and below. */
function Canvas({ still }: { still?: FilmImage }) {
  return (
    <div className="relative mb-2 mr-2">
      <Still still={still} sizes="(min-width: 1024px) 320px, 90vw" className="aspect-[3/2] w-full" />
      <span aria-hidden className="absolute -right-2 bottom-0 top-2 w-2 bg-[#141415]" />
      <span aria-hidden className="absolute -bottom-2 left-2 right-0 h-2 bg-[#101011]" />
    </div>
  );
}

/** Loose prints: three 4×6s with white borders, fanned a little on the table. */
function PrintStack({ stills }: { stills: (FilmImage | undefined)[] }) {
  const tilt = ["-rotate-6 left-[4%] top-[14%]", "rotate-3 left-[30%] top-[6%]", "-rotate-1 left-[18%] top-[30%]"];
  return (
    <div className="relative aspect-[4/3]">
      {tilt.map((position, i) => (
        <div key={position} className={`absolute w-[58%] bg-strong p-[3.5%] ${position}`}>
          <Still still={stills[i] ?? stills[0]} sizes="(min-width: 640px) 190px, 40vw" className="aspect-[3/2] w-full" />
        </div>
      ))}
    </div>
  );
}

/** A photo book, closed: a photo-wrapped cover, a darker spine, the page edges showing on the right. */
function PhotoBook({ still }: { still?: FilmImage }) {
  return (
    <div className="relative mx-auto w-[82%]">
      <Still still={still} sizes="(min-width: 640px) 230px, 50vw" className="aspect-[4/5] w-full rounded-r-[3px]" />
      <span aria-hidden className="absolute inset-y-0 left-0 w-[7%] bg-black/45" />
      <span aria-hidden className="absolute inset-y-0 left-[7%] w-px bg-strong/30" />
      <span aria-hidden className="absolute -right-1.5 bottom-[2%] top-[2%] w-1.5 rounded-r-[2px] bg-strong/85" />
    </div>
  );
}

/**
 * "From the darkroom": the prints as objects on a gallery wall, made in CSS
 * with the studio's own stills inside: an open album, a matted frame, a
 * canvas, a stack of prints, a photo book. The wall scrolls sideways (the
 * shared Carousel, like the films and reviews); the objects sit on one
 * baseline at different sizes, each with a small museum-style label. The whole
 * object is the link to its page.
 */
export function DarkroomWall({ prints, stills, center }: { prints: Print[]; stills: Record<string, FilmImage>; center?: ReactNode }) {
  const objects: Record<string, (print: Print) => ReactNode> = {
    "premium-albums": (print) => <Album stills={print.previewFilmIds.map((id) => stills[id])} />,
    "photo-frames": (print) => <Frame still={stills[print.previewFilmIds[0]]} />,
    "canvas-prints": (print) => <Canvas still={stills[print.previewFilmIds[0]]} />,
    "photo-prints": (print) => <PrintStack stills={print.previewFilmIds.map((id) => stills[id])} />,
    "photo-books": (print) => <PhotoBook still={stills[print.previewFilmIds[0]]} />,
  };
  // Each object keeps its own proportions; widths vary like pieces on a real wall.
  const widths: Record<string, string> = {
    "premium-albums": "w-[84vw] sm:w-[460px]",
    "photo-frames": "w-[58vw] sm:w-[250px]",
    "canvas-prints": "w-[80vw] sm:w-[380px]",
    "photo-prints": "w-[76vw] sm:w-[330px]",
    "photo-books": "w-[60vw] sm:w-[260px]",
  };

  return (
    <Carousel label="Prints and albums" gap="gap-10 lg:gap-14" center={center}>
      {prints.map((print) => (
        // Full height, object pushed down: every object stands on the same baseline above its label.
        <article key={print.slug} className={`group relative flex shrink-0 snap-start flex-col justify-end ${widths[print.slug] ?? "w-[70vw] sm:w-[320px]"}`}>
          {objects[print.slug]?.(print)}
          <div className="mt-6 border-l border-primary pl-3">
            <h3 className="text-[15px] font-semibold text-strong transition-colors duration-150 group-hover:text-primary">
              <Link href={routes.print(print.slug)} className="after:absolute after:inset-0">
                {print.name}
              </Link>
            </h3>
            <p lang="ne" className="text-xs text-muted">
              {print.nameNe}
            </p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{print.highlight}</p>
          </div>
        </article>
      ))}
    </Carousel>
  );
}
