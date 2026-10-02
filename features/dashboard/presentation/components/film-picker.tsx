"use client";

import Image from "next/image";
import { useState } from "react";
import { Check } from "lucide-react";
import type { ImageAsset } from "@/shared/domain/image";
import { labelClass } from "./ui";

export type PickableFilm = { id: string; title: string; thumbnail: ImageAsset | null };

/**
 * Choose film stills (by YouTube id) for a service's cover or a print's mock-up. Sends the
 * chosen ids, in the order picked, as a comma list in a hidden input named `name`.
 */
export function FilmPicker({ name, label, films, defaultValue, max, hint }: { name: string; label: string; films: PickableFilm[]; defaultValue: string[]; max: number; hint?: string }) {
  const [picked, setPicked] = useState<string[]>(defaultValue.filter((id) => films.some((f) => f.id === id)));
  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : max === 1 ? [id] : current.length >= max ? current : [...current, id]));

  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{label}</legend>
      {hint && <p className="-mt-1 mb-3 text-xs text-muted">{hint}</p>}
      <input type="hidden" name={name} value={picked.join(",")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {films.map((film) => {
          const order = picked.indexOf(film.id);
          const selected = order >= 0;
          return (
            <button
              key={film.id}
              type="button"
              onClick={() => toggle(film.id)}
              aria-pressed={selected}
              className={`group min-w-0 rounded-card border p-1.5 text-left transition-colors duration-150 ${selected ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong"}`}
            >
              <span className="relative block aspect-video overflow-hidden rounded-control bg-raised">
                {film.thumbnail && <Image src={film.thumbnail.src} alt="" fill sizes="180px" className="object-cover" />}
                {selected && (
                  <span className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">{max === 1 ? <Check className="h-3.5 w-3.5" aria-hidden /> : order + 1}</span>
                )}
              </span>
              <span className="mt-1.5 block truncate px-0.5 text-xs text-foreground">{film.title}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        {picked.length === 0 ? "None chosen." : `${picked.length} chosen${max > 1 ? ` (up to ${max})` : ""}.`}
      </p>
    </fieldset>
  );
}
