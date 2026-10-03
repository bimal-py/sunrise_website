"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { IconSubmit } from "./icon-submit";

/**
 * Move a row up or down: one small form sending the row's id and `direction` ("up" or
 * "down") to the list's move action. While it runs, both arrows are disabled, the pressed one
 * spins and the gold top bar shows, so a double tap can't queue two moves.
 */
export function ReorderButtons({
  action,
  id,
  isFirst,
  isLast,
  name,
  idName = "id",
  className = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  isFirst: boolean;
  isLast: boolean;
  /** The row's name, for the buttons' labels ("Move Weddings up"). */
  name: string;
  /** The id field's name, if the action reads another one (films: "youtube_id"). */
  idName?: string;
  className?: string;
}) {
  return (
    <form action={action} className={`flex items-center gap-1.5 ${className}`}>
      <input type="hidden" name={idName} value={id} />
      <IconSubmit label={`Move ${name} up`} name="direction" value="up" disabled={isFirst}>
        <ArrowUp size={16} aria-hidden />
      </IconSubmit>
      <IconSubmit label={`Move ${name} down`} name="direction" value="down" disabled={isLast}>
        <ArrowDown size={16} aria-hidden />
      </IconSubmit>
    </form>
  );
}
