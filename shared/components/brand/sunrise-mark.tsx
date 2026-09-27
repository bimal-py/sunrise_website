/**
 * The sunrise mark: a gold half-sun on the horizon with rays and two lines of
 * reflection, taken from the logo. Drawn as SVG so it's crisp at any size and
 * weighs nothing.
 *
 * `animated` (the splash) adds the classes the splash keyframes in globals.css
 * hook into: the horizon draws, the sun rises behind it, the rays draw one by one.
 * Static (the hero), it's just the mark. The splash ends by gliding its big
 * mark onto the hero's small one (splash-screen.tsx), so both must keep the
 * same geometry: only the size and `strokeWidth` differ.
 */

const CX = 120; // sun centre x
const HORIZON = 110;
const SUN_R = 42;

// Nine rays across the upper half, alternating long and short.
const rays = Array.from({ length: 9 }, (_, i) => {
  const angle = Math.PI + (Math.PI * (i + 1)) / 10;
  const outer = i % 2 === 0 ? 78 : 68;
  const inner = 54;
  const x1 = CX + inner * Math.cos(angle);
  const y1 = HORIZON + inner * Math.sin(angle);
  const x2 = CX + outer * Math.cos(angle);
  const y2 = HORIZON + outer * Math.sin(angle);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
});

export function SunriseMark({
  id,
  animated = false,
  strokeWidth = 3,
  className = "",
}: {
  /** Unique per page: names the clip path that hides the sun below the horizon. */
  id: string;
  animated?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  const clip = `${id}-above-horizon`;
  const a = (name: string) => (animated ? name : undefined);

  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden fill="none">
      <defs>
        <clipPath id={clip}>
          <rect x="-10" y="-10" width="260" height={HORIZON + 10} />
        </clipPath>
      </defs>

      <g className="sunrise-strokes text-primary" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        {/* Horizon, drawn first; its full width is ~1 unit of pathLength for the draw animation. */}
        <path d={`M10 ${HORIZON}H230`} pathLength={1} className={a("splash-draw")} style={animated ? { ["--d" as string]: "150ms" } : undefined} />
        <g clipPath={`url(#${clip})`}>
          <circle cx={CX} cy={HORIZON} r={SUN_R} fill="currentColor" stroke="none" className={a("splash-rise")} />
        </g>
        {rays.map((d, i) => (
          <path key={d} d={d} pathLength={1} className={a("splash-draw")} style={animated ? { ["--d" as string]: `${900 + i * 55}ms` } : undefined} />
        ))}
        <path d={`M${CX - 38} ${HORIZON + 14}H${CX + 38}`} pathLength={1} opacity="0.7" className={a("splash-draw")} style={animated ? { ["--d" as string]: "600ms" } : undefined} />
        <path d={`M${CX - 18} ${HORIZON + 26}H${CX + 18}`} pathLength={1} opacity="0.5" className={a("splash-draw")} style={animated ? { ["--d" as string]: "700ms" } : undefined} />
      </g>
    </svg>
  );
}
