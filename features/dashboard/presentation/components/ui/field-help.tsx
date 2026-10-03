"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Mode = "closed" | "hover" | "focus" | "pinned";
type State = { mode: Mode; host: HTMLElement | null };

const CLOSED: State = { mode: "closed", host: null };
/** Space between the chip and the note, and the least space kept from the window's edges. */
const GAP = 8;
const EDGE = 12;

/**
 * The portfolio's "?" chip beside a field label. Pointing at it (mouse), tabbing to it or
 * tapping it opens a short note under it: what the field is for, then "e.g. …" on its own
 * line. A click (or a tap) pins the note open until a second click, Esc or a click
 * elsewhere. The note opens below the chip and flips left or above when it would run off
 * screen. It is rendered in a portal (inside the open dialog, if there is one), so no card or
 * scroller clips it and its text never becomes part of the field's accessible label.
 */
export function FieldHelp({ help, example, label }: { help?: ReactNode; example?: string; label?: string }) {
  const [state, setState] = useState<State>(CLOSED);
  const open = state.mode !== "closed";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef(0);
  const pressingNote = useRef(false);
  const noteId = useId();

  /** Inside a modal dialog the rest of the page is inert and drawn below it, so the note goes in the dialog. */
  const hostFor = (): HTMLElement => buttonRef.current?.closest<HTMLElement>("dialog[open]") ?? document.body;
  const cancelHide = () => window.clearTimeout(hideTimer.current);
  const show = (mode: "hover" | "focus") => {
    cancelHide();
    const host = hostFor();
    setState((current) => (current.mode === "closed" ? { mode, host } : current));
  };
  const hideSoon = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setState((current) => (current.mode === "hover" ? CLOSED : current)), 140);
  };

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  // Place the note next to the chip (fixed, so scrolled or clipped parents can't hide it), and follow the chip.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const button = buttonRef.current;
      const note = noteRef.current;
      if (!button || !note) return;
      const chip = button.getBoundingClientRect();
      const width = note.offsetWidth;
      const height = note.offsetHeight;
      let left = chip.left;
      if (left + width > window.innerWidth - EDGE) left = Math.max(EDGE, chip.right - width);
      let top = chip.bottom + GAP;
      if (top + height > window.innerHeight - EDGE && chip.top - GAP - height >= EDGE) top = chip.top - GAP - height;
      note.style.left = `${Math.round(left)}px`;
      note.style.top = `${Math.round(top)}px`;
    };
    place();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [open, state.host]);

  // While open: a press anywhere else closes it; so does Esc (before any dialog behind it hears the key).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target) || noteRef.current?.contains(target)) return;
      setState(CLOSED);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setState(CLOSED);
    };
    const onPointerUp = () => {
      pressingNote.current = false;
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  if (!help && !example) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label ? `About ${label}` : "Help"}
        aria-expanded={open}
        aria-describedby={open ? noteId : undefined}
        onClick={(event) => {
          // Inside a field's <label>: don't let the click move focus to the input.
          event.preventDefault();
          cancelHide();
          const host = hostFor();
          // A note opened by pointing gets pinned; one opened from the keyboard (or pinned) closes.
          setState((current) => (current.mode === "pinned" || current.mode === "focus" ? CLOSED : { mode: "pinned", host }));
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) show("focus");
        }}
        onBlur={(event) => {
          if (pressingNote.current || noteRef.current?.contains(event.relatedTarget as Node | null)) return;
          setState((current) => (current.mode === "focus" || current.mode === "pinned" ? CLOSED : current));
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") show("hover");
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") hideSoon();
        }}
        className={`relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold normal-case leading-none tracking-normal transition-colors duration-150 before:absolute before:-inset-1 ${
          open ? "border-primary text-primary" : "border-line-strong text-muted hover:text-strong"
        }`}
      >
        ?
      </button>
      {open && state.host
        ? createPortal(
            <span
              ref={noteRef}
              id={noteId}
              role="tooltip"
              onPointerEnter={cancelHide}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") hideSoon();
              }}
              onPointerDown={() => {
                pressingNote.current = true;
              }}
              className="fixed left-0 top-0 z-[70] block w-56 max-w-[calc(100vw-1.5rem)] select-text rounded-card border border-line-strong bg-raised px-3 py-2 text-left font-mono text-xs font-normal normal-case leading-5 tracking-normal text-foreground shadow-[0_4px_6px_rgba(0,0,0,0.3),0_16px_40px_rgba(0,0,0,0.55)]"
            >
              {help ? <span className="block">{help}</span> : null}
              {example ? <span className={`block text-muted ${help ? "mt-1" : ""}`}>e.g. {example}</span> : null}
            </span>,
            state.host,
          )
        : null}
    </>
  );
}
