"use client";

import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Click-and-drag sideways scrolling for an `overflow-x-auto` strip (the bucket chips), as on
 * the portfolio. Mouse only: touch and pens keep the browser's own scrolling. A small move
 * threshold tells a drag from a click, and a drag swallows the click that ends it, so dragging
 * the strip never presses a chip.
 *
 *   const { handlers, className } = useDragScroll<HTMLDivElement>();
 *   <div {...handlers} className={`overflow-x-auto ${className}`}>…</div>
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const onPointerDown = (event: ReactPointerEvent<T>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { active: true, startX: event.clientX, startScroll: event.currentTarget.scrollLeft, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<T>) => {
    const state = drag.current;
    if (!state.active) return;
    const strip = event.currentTarget;
    const dx = event.clientX - state.startX;
    if (!state.moved && Math.abs(dx) > 4) {
      state.moved = true;
      strip.setPointerCapture?.(event.pointerId);
    }
    if (state.moved) strip.scrollLeft = state.startScroll - dx;
  };

  const onPointerUp = (event: ReactPointerEvent<T>) => {
    const strip = event.currentTarget;
    if (strip.hasPointerCapture?.(event.pointerId)) strip.releasePointerCapture(event.pointerId);
    drag.current.active = false;
  };

  const onClickCapture = (event: ReactMouseEvent<T>) => {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
    className: "cursor-grab active:cursor-grabbing",
  };
}
