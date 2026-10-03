import type { CSSProperties } from "react";

/**
 * Draws a stored icon (cleaned SVG markup from lib/icons/iconify.ts) as a CSS mask over the
 * text colour, so it takes the same colours and hovers as the lucide icons around it. An SVG
 * used as a mask image is rendered as a static picture: nothing in it can run or load.
 * Size it with `className` (h-5 w-5 by default). Pass `label` only when the icon stands alone
 * and means something; otherwise it's hidden from screen readers.
 */
export function MaskIcon({ svg, className = "h-5 w-5", label }: { svg: string; className?: string; label?: string }) {
  const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const style: CSSProperties = {
    maskImage: image,
    WebkitMaskImage: image,
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 bg-current ${className}`}
      style={style}
    />
  );
}
