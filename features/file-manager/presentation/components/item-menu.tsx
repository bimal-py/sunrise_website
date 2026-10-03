"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export type MenuItem = { label: string; icon: ReactNode; onSelect: () => void; danger?: boolean };

/** The floating nav's shadow: the one shadow the site allows, for things that float. */
const FLOAT_SHADOW = "shadow-[0_4px_6px_rgba(0,0,0,0.3),0_16px_40px_rgba(0,0,0,0.55)]";
const ITEM_HEIGHT = 40;
/** w-44 */
const MENU_WIDTH = 176;

/**
 * The portfolio file manager's "…" menu on a tile or a row. Opens below its button, right-aligned
 * (above it near the bottom of the screen, left-aligned near the left edge); closes on a click elsewhere, Esc (focus back on the button),
 * Tab or a choice. Arrow keys, Home and End move through the items. `onImage` gives the button
 * a dark backing so it reads over a photo.
 */
export function ItemMenu({
  label,
  items,
  open,
  onOpenChange,
  onImage = false,
}: {
  /** What the menu is for, read out as "Actions for <label>". */
  label: string;
  items: MenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImage?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const menuId = useId();
  const latest = useRef(onOpenChange);
  useEffect(() => {
    latest.current = onOpenChange;
  });

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) latest.current(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      latest.current(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      const needed = items.length * ITEM_HEIGHT + 16;
      setUp(Boolean(rect && window.innerHeight - rect.bottom < needed && rect.top > needed));
      setAlignLeft(Boolean(rect && rect.right - MENU_WIDTH < 8));
    }
    onOpenChange(!open);
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (buttons.length === 0) return;
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    const focus = (next: number) => buttons[(next + buttons.length) % buttons.length]?.focus();
    if (event.key === "ArrowDown") focus(index + 1);
    else if (event.key === "ArrowUp") focus(index - 1);
    else if (event.key === "Home") focus(0);
    else if (event.key === "End") focus(buttons.length - 1);
    else {
      if (event.key === "Tab") onOpenChange(false);
      return;
    }
    event.preventDefault();
  };

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={`inline-flex size-9 items-center justify-center rounded-full transition-colors duration-150 pointer-coarse:size-11 ${
          onImage ? "text-strong hover:text-primary" : "text-muted hover:bg-raised hover:text-strong"
        } ${open ? "text-primary" : ""}`}
      >
        {/* Over a photo: a small dark chip inside the full-size hit area. */}
        {onImage ? (
          <span className="flex size-7 items-center justify-center rounded-full bg-background/80">
            <MoreHorizontal size={16} aria-hidden />
          </span>
        ) : (
          <MoreHorizontal size={16} aria-hidden />
        )}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Actions for ${label}`}
          onKeyDown={onMenuKey}
          className={`absolute ${alignLeft ? "left-0" : "right-0"} z-30 w-44 rounded-card border border-line-strong bg-surface py-1 ${FLOAT_SHADOW} ${up ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                // Back on the "…" button first, so a dialog this opens hands focus back to it when it closes.
                triggerRef.current?.focus();
                onOpenChange(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-raised focus-visible:bg-raised focus-visible:outline-none pointer-coarse:py-3 ${
                item.danger ? "text-error" : "text-foreground hover:text-strong focus-visible:text-strong"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
