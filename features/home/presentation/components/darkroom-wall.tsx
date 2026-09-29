import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { FilmImage } from "@/features/films/domain/entities";
import type { Print } from "@/features/prints/domain/entities";
import { Carousel } from "@/shared/components/ui/carousel";
import { routes } from "@/lib/routes";
import { hangOnLine } from "./drying-line";

/*
 * Heights on the line are in px on sm+ and scaled by --line-scale below sm
 * (globals.css), where the pieces are narrower: the rope then drops less, so
 * the pieces tilt about as much as on a laptop.
 */
const scaled = (px: number) => `calc(${Math.round(px * 10) / 10}px * var(--line-scale))`;

/**
 * A small black binder clip hung on the rope, drawn in two parts so it wraps
 * the rope. The "back" part (the back handle) is painted behind the rope; the
 * "front" part (the front handle, its bar resting on top of the rope and its
 * legs down in front of it, and the body gripping the parent's top edge) in
 * front. Both handles hook into the body's rolled lip at the same two points;
 * the back one leans away, so from slightly above its bar shows higher and a
 * little to the right. The rope runs 6px below the clip's top; the parent's
 * top edge is 23.5px down, inside the jaws, so it hangs `hang` px below the
 * rope. Centred on `at` (% across its parent). A loose print's back handle
 * takes the print's `drop` and `tilt` (the front one moves with the print).
 */
function Clip({ at, part, drop, tilt }: { at: number; part: "front" | "back"; drop?: number; tilt?: string }) {
  const style: CSSProperties = { left: `${at}%` };
  if (drop !== undefined) style.translate = `-50% ${scaled(drop)}`;
  if (tilt) Object.assign(style, { rotate: tilt, transformOrigin: "50% 23.5px" });
  return (
    <svg aria-hidden viewBox="0 0 22 32" className="darkroom-clip" style={style}>
      {part === "back" ? (
        <path className="clip-handle-back" d="M2.6 21.8 6.1 2.3Q6.3.6 7.9.6H18.1Q19.7.6 19.8 2.3L19.4 21.8" />
      ) : (
        <>
          <path className="clip-handle" d="M2.6 21.8 3.9 4.6Q4.1 3 5.6 3H16.4Q17.9 3 18.1 4.6L19.4 21.8" />
          <rect className="clip-body" x="1" y="21" width="20" height="9" rx="1" />
          <rect className="clip-lip" x="0.6" y="20.6" width="20.8" height="2.6" rx="1.3" />
          <path className="clip-shine" d="M2 21.2H20" />
          <path className="clip-contact" d="M1.6 30.5H20.4" />
        </>
      )}
    </svg>
  );
}
/** How far below the rope a piece's top edge hangs on its clips (matches .darkroom-clip's top). */
const hang = 17.5;

/**
 * A run of rope through `points` ([x across the svg, as a % or px; drop in
 * px]), shaded like a round cord: a dark underside, the twine lifted above it,
 * a highlight along the top, and the strands (the shared #darkroom-twist) over
 * all of it. Straight lines with round caps join up; the strokes keep their
 * width when --line-scale squashes the run.
 */
function Rope({ points, className }: { points: [string, number][]; className: string }) {
  const run = (lift: number, part: string) => (
    <g className={part} transform={`translate(0 ${-lift})`}>
      <g className="rope-scale">
        {points.slice(1).map(([x, y], i) => (
          <line key={x} x1={points[i][0]} y1={points[i][1]} x2={x} y2={y} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </g>
  );
  return (
    <svg aria-hidden className={`darkroom-rope pointer-events-none absolute top-0 h-px overflow-visible ${className}`}>
      {run(0, "rope-under")}
      {run(0.6, "rope-twine")}
      {run(1.5, "rope-shine")}
      {run(0, "rope-twist")}
    </svg>
  );
}

/**
 * The rope's strands: at 35°, a dark groove between strands with the next
 * strand's highlight beside it, three to a 13.5px repeat at uneven spacing so
 * it doesn't read as stripes. Each run of rope paints it in its own space, so
 * it may shift a hair where runs meet.
 */
function RopeTwist() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <pattern id="darkroom-twist" width="13.5" height="13.5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          {[0, 4.3, 9.1].map((x) => (
            <g key={x}>
              <rect x={x} width="1" height="13.5" fill="#2f2416" fillOpacity="0.6" />
              <rect x={x + 1.7} width="0.8" height="13.5" fill="#f0dfb8" fillOpacity="0.3" />
            </g>
          ))}
        </pattern>
      </defs>
    </svg>
  );
}

function Still({ still, sizes, className }: { still?: FilmImage; sizes: string; className: string }) {
  if (!still) return <div className={`bg-raised ${className}`} />;
  return (
    <Image src={still.src} alt="" width={still.width} height={still.height} sizes={sizes} placeholder="blur" blurDataURL={still.blurDataURL} className={`object-cover ${className}`} />
  );
}

/** An open album: two pages of photos with white margins, a fold down the middle (shading deepening into it), the cover showing beneath. */
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
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 bg-black/[0.05]" />
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-black/[0.08]" />
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/40" />
      </div>
    </div>
  );
}

/**
 * A framed print: a walnut moulding (lit a shade lighter along the top, its
 * outer edge catching the light), a dark line where it meets the white mat,
 * the photo in the middle.
 */
function Frame({ still }: { still?: FilmImage }) {
  return (
    <div className="border-[10px] border-[#4a3324] border-t-[#5a3f2b] outline outline-1 outline-[#6a4b33]">
      <div className="border border-[#1f160f] bg-strong p-[12%]">
        <Still still={still} sizes="(min-width: 1024px) 200px, 60vw" className="aspect-[4/5] w-full object-[45%_50%]" />
      </div>
    </div>
  );
}

/**
 * A canvas: the photo stretched over a frame, its wrapped right side showing
 * (seen, like the clips, from a little to the right): the photo's own right
 * edge carrying on round the stretcher, in shade.
 */
function Canvas({ still }: { still?: FilmImage }) {
  return (
    <div className="relative mr-1.5">
      <Still still={still} sizes="(min-width: 1024px) 320px, 90vw" className="aspect-[3/2] w-full" />
      {/* The face's own right edge, cropped the same way, continuing round the side. */}
      <div aria-hidden className="absolute -bottom-0.5 -right-1.5 top-0.5 w-1.5 overflow-hidden brightness-[0.55]">
        <Still still={still} sizes="(min-width: 1024px) 320px, 90vw" className="absolute right-0 top-0 aspect-[3/2] h-full w-auto max-w-none" />
      </div>
    </div>
  );
}

/**
 * Loose prints: three upright 4×6s (2:3) with white borders side by side,
 * each on its own centred clip at its own point on the line (`drops`: px
 * below the highest), settled to the rope's slope (`tilt`).
 */
function PrintStack({ stills, drops, tilt }: { stills: (FilmImage | undefined)[]; drops: number[]; tilt: string }) {
  return (
    <div className="grid grid-cols-3 gap-[3%]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="relative origin-top bg-strong p-[6%]" style={{ translate: `0 ${scaled(drops[i] ?? 0)}`, rotate: tilt }}>
          <Still still={stills[i] ?? stills[0]} sizes="(min-width: 640px) 160px, 25vw" className="aspect-[2/3] w-full" />
          <Clip at={50} part="front" />
        </div>
      ))}
    </div>
  );
}

/**
 * A photo book, closed: a photo-wrapped cover (its lower part: the film's logo
 * sits top right), a dark cloth spine with its hinge groove. Seen from a little
 * to the right: the cover board's edge, then the page block in shade, set in
 * from the top and bottom where the boards overhang it.
 */
function PhotoBook({ still }: { still?: FilmImage }) {
  return (
    <div className="relative mx-auto w-[82%]">
      <Still still={still} sizes="(min-width: 640px) 230px, 50vw" className="aspect-[4/5] w-full rounded-r-[3px] object-bottom" />
      <span aria-hidden className="absolute inset-y-0 left-0 w-[7%] bg-[#3a322b]" />
      <span aria-hidden className="absolute inset-y-0 left-[7%] w-px bg-black/60" />
      <span aria-hidden className="absolute inset-y-0 -right-[1.5px] w-[1.5px] bg-[#2a2420]" />
      <span aria-hidden className="absolute -right-[5px] bottom-[3%] top-[3%] w-[3.5px] bg-[#8f8b83]" />
    </div>
  );
}

// How each piece hangs. `width` is its size on the line (nominal = the sm+ px,
// for the rope's shape); clips are fractions across it; weight pulls the rope
// down. Wide pieces take two clips, narrow ones one; the three loose prints
// each hang from their own.
const pieces: Record<string, { width: string; nominal: number; clips: number[]; weight: number; loose?: boolean }> = {
  "premium-albums": { width: "w-[76vw] sm:w-[460px]", nominal: 460, clips: [0.16, 0.84], weight: 3 },
  "photo-frames": { width: "w-[58vw] sm:w-[250px]", nominal: 250, clips: [0.5], weight: 2.6 },
  "canvas-prints": { width: "w-[76vw] sm:w-[380px]", nominal: 380, clips: [0.15, 0.83], weight: 2 },
  "photo-prints": { width: "w-[76vw] sm:w-[500px]", nominal: 500, clips: [0.1567, 0.5, 0.8433], weight: 0.9, loose: true },
  "photo-books": { width: "w-[60vw] sm:w-[260px]", nominal: 260, clips: [0.5], weight: 1.2 },
};
const fallback = { width: "w-[70vw] sm:w-[320px]", nominal: 320, clips: [0.5], weight: 1.5 };
/** Where the rope is tied, off screen (px below the track's top), and its deepest sag below that. */
const anchor = -4;
const sag = 56;
/** How far off screen the hooks are, and how far the rope is drawn beyond the end pieces (past the scroller's edge at any width). */
const reach = 320;
const lead = 200;

/** A fraction as a CSS percentage, to 2 decimals. */
const pct = (fraction: number) => Math.round(fraction * 10000) / 100;

/**
 * "From the darkroom": the prints as objects hanging on a drying line, made in
 * CSS with the studio's own stills inside: an open album, a framed print, a
 * canvas, three loose prints, a photo book. Small black binder clips hang each
 * one on a twisted cord, their handles wrapped round it. The rope sags under
 * them as a real loaded line does (drying-line.ts), and each piece settles to
 * the rope's slope where it hangs. Each piece draws its own stretch of rope
 * (and the run to the next), so the line is continuous at any width and moves
 * with the scroller (the shared Carousel, like the films and reviews). The
 * museum-style labels share one baseline under the pieces. With a mouse, the
 * pieces rest a little dim and the one you point at lights up (globals.css
 * "Darkroom line"). The whole object is the link to its page.
 */
export function DarkroomWall({ prints, stills, center }: { prints: Print[]; stills: Record<string, FilmImage>; center?: ReactNode }) {
  // `drops`: how far below the piece's top each of its clips hangs; `tilt`: the rope's slope there (only loose prints use them).
  const objects: Record<string, (print: Print, drops: number[], tilt: string) => ReactNode> = {
    "premium-albums": (print) => <Album stills={print.previewFilmIds.map((id) => stills[id])} />,
    "photo-frames": (print) => <Frame still={stills[print.previewFilmIds[0]]} />,
    "canvas-prints": (print) => <Canvas still={stills[print.previewFilmIds[0]]} />,
    "photo-prints": (print, drops, tilt) => <PrintStack stills={print.previewFilmIds.map((id) => stills[id])} drops={drops} tilt={tilt} />,
    "photo-books": (print) => <PhotoBook still={stills[print.previewFilmIds[0]]} />,
  };
  const setups = prints.map((print) => pieces[print.slug] ?? fallback);
  const line = hangOnLine(
    setups.map(({ nominal, clips, weight }) => ({ width: nominal, clips, weight })),
    { gap: 48, reach, lead, sag },
  );
  const at = (drop: number) => anchor + drop;

  return (
    <>
      <RopeTwist />
      <Carousel label="Prints and albums" gap="gap-[var(--line-gap)]" center={center} className="darkroom-line">
        {prints.map((print, index) => {
          const setup = setups[index];
          const hung = line.pieces[index];
          const next = line.pieces[index + 1];
          const first = setup.clips[0];
          const last = setup.clips[setup.clips.length - 1];
          // The piece's top edge sits `hang` below the rope at its clips and
          // follows the rope's slope there: between its two clips, or for a
          // single clip the rope's run across the piece. The angle is atan2 of
          // the drop over the run, the run in cqw so it holds at any width.
          const top = setup.loose ? Math.min(...hung.clips) : (hung.clips[0] + hung.clips[hung.clips.length - 1]) / 2;
          const drops = hung.clips.map((drop) => drop - top);
          const slope =
            setup.clips.length > 1 && !setup.loose
              ? `atan2(${scaled(hung.clips[hung.clips.length - 1] - hung.clips[0])}, ${pct(last - first)}cqw)`
              : `atan2(${scaled(hung.right - hung.left)}, 100cqw)`;
          const turn: CSSProperties | undefined = setup.loose ? undefined : { transformOrigin: `${pct((first + last) / 2)}% 0`, rotate: slope };
          const pieceTop = `calc(${at(top)}px * var(--line-scale) + ${hang}px)`;

          return (
            <article
              key={print.slug}
              className={`darkroom-item group @container relative flex shrink-0 snap-start flex-col ${setup.width}`}
              style={{ paddingTop: pieceTop }}
            >
              {/* The clips' back handles, behind the rope: laid out and turned exactly like the piece. */}
              <div aria-hidden className="darkroom-dim pointer-events-none absolute inset-x-0" style={{ top: pieceTop, ...turn }}>
                {setup.clips.map((clip, i) =>
                  setup.loose ? (
                    <Clip key={clip} at={pct(clip)} part="back" drop={drops[i]} tilt={slope} />
                  ) : (
                    <Clip key={clip} at={pct(clip)} part="back" />
                  ),
                )}
              </div>
              {/* The rope: in from off screen, across this piece through its clips, and on to the next piece (or off screen after the last). */}
              {index === 0 && <Rope className="left-0 w-px" points={[[`${-lead}`, at(line.start)], [`${-lead / 2}`, at(line.before)], ["0", at(hung.left)]]} />}
              <Rope className="left-0 w-full" points={[["0%", at(hung.left)], ...setup.clips.map((clip, i): [string, number] => [`${pct(clip)}%`, at(hung.clips[i])]), ["100%", at(hung.right)]]} />
              {next ? (
                <Rope className="left-full w-[var(--line-gap)]" points={[["0%", at(hung.right)], ["50%", at(hung.after)], ["100%", at(next.left)]]} />
              ) : (
                <Rope className="left-full w-px" points={[["0", at(hung.right)], [`${lead / 2}`, at(hung.after)], [`${lead}`, at(line.end)]]} />
              )}
              <div className="darkroom-dim relative" style={turn}>
                {objects[print.slug]?.(print, drops, slope)}
                {!setup.loose && setup.clips.map((clip) => <Clip key={clip} at={pct(clip)} part="front" />)}
              </div>
              <div className="mt-auto pt-6">
                <div className="border-l border-primary pl-3">
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
              </div>
            </article>
          );
        })}
      </Carousel>
    </>
  );
}
