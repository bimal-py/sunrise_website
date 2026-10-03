"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import type { ImageAsset } from "@/shared/domain/image";
import { dashboardButtonClass } from "./ui/button-classes";
import { DashboardField, DashboardInput } from "./ui/dashboard-ui";

export type PickableFilm = { id: string; title: string; thumbnail: ImageAsset | null };

/** Films shown at first (and added by each "Show more"): the list can run to hundreds. */
const STEP = 15;

/**
 * Choose film stills (by YouTube id) for a service's cover or a print's mock-up: the chosen
 * ones first (numbered in the order picked), then the others newest first, with a search by
 * title. Sends the chosen ids, in order, as a comma list in a hidden input named `name`.
 */
export function FilmPicker({
  name,
  label,
  films,
  defaultValue,
  max,
  hint,
  help,
  example,
}: {
  name: string;
  label: string;
  films: PickableFilm[];
  defaultValue: string[];
  max: number;
  hint?: ReactNode;
  help?: ReactNode;
  example?: string;
}) {
  const [picked, setPicked] = useState<string[]>(() => defaultValue.filter((id) => films.some((film) => film.id === id)).slice(0, max));
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(STEP);

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : max === 1 ? [id] : current.length >= max ? current : [...current, id]));

  const term = query.trim().toLowerCase();
  const chosen = picked.map((id) => films.find((film) => film.id === id)).filter((film): film is PickableFilm => Boolean(film));
  const others = films.filter((film) => !picked.includes(film.id) && (!term || film.title.toLowerCase().includes(term)));
  const visible = [...chosen, ...others.slice(0, shown)];
  const hidden = others.length - Math.min(others.length, shown);
  const full = max > 1 && picked.length >= max;

  return (
    <DashboardField as="div" label={label} help={help} example={example} hint={hint}>
      <input type="hidden" name={name} value={picked.join(",")} />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search size={15} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <DashboardInput
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(STEP);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Search films by title"
            aria-label={`Search films for “${label}”`}
            className="pl-10"
          />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted" aria-live="polite">
          {picked.length === 0 ? "None chosen" : max === 1 ? "1 chosen" : `${picked.length} of ${max} chosen`}
        </p>
      </div>
      {films.length === 0 ? (
        <p className="rounded-card border border-line bg-raised px-4 py-6 text-center text-sm text-muted">No films with a still yet. Sync films from YouTube first.</p>
      ) : visible.length === 0 ? (
        <p className="rounded-card border border-line bg-raised px-4 py-6 text-center text-sm text-muted">No film matches “{query.trim()}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((film) => {
            const order = picked.indexOf(film.id);
            const selected = order >= 0;
            const blocked = !selected && full;
            return (
              <button
                key={film.id}
                type="button"
                onClick={() => toggle(film.id)}
                aria-pressed={selected}
                disabled={blocked}
                title={blocked ? `Up to ${max}: untick one first` : film.title}
                className={`group min-w-0 rounded-card border p-1.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-primary bg-primary-soft" : "border-line bg-raised hover:border-line-strong"}`}
              >
                <span className="relative block aspect-video overflow-hidden rounded-control bg-surface">
                  {film.thumbnail ? (
                    <Image
                      src={film.thumbnail.src}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
                      placeholder={film.thumbnail.blurDataURL ? "blur" : "empty"}
                      blurDataURL={film.thumbnail.blurDataURL || undefined}
                      className="object-cover"
                    />
                  ) : null}
                  {selected ? (
                    <span className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                      {max === 1 ? <Check size={14} aria-hidden /> : order + 1}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1.5 block truncate px-0.5 text-xs text-foreground">{film.title}</span>
              </button>
            );
          })}
        </div>
      )}
      {hidden > 0 ? (
        <button type="button" onClick={() => setShown((count) => count + STEP)} className={dashboardButtonClass("ghost", "mt-3")}>
          Show {Math.min(STEP, hidden)} more of {hidden}
        </button>
      ) : null}
    </DashboardField>
  );
}
