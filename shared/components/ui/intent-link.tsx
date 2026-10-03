"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * A link that prefetches its page only once someone shows intent (pointer over it, a touch,
 * keyboard focus), not as soon as it scrolls into view: card grids, the home scenes and the
 * footer would otherwise fetch every page they link to over a phone's data. Next 16's
 * documented pattern (docs: prefetching → "Hover-triggered prefetch").
 */
export function IntentLink({ onPointerEnter, onTouchStart, onFocus, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onPointerEnter={(event) => {
        setActive(true);
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        setActive(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setActive(true);
        onFocus?.(event);
      }}
    />
  );
}
