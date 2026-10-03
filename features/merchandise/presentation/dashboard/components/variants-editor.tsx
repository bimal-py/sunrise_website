"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { ImageOff, Layers, Plus, TriangleAlert, X } from "lucide-react";
import type { StockStatus } from "@/features/merchandise/domain/entities";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardField, DashboardInput, DashboardSelect, fieldLabelClass, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { FieldHelp } from "@/features/dashboard/presentation/components/ui/field-help";
import { ConfirmDialog } from "@/features/dashboard/presentation/components/ui/modal";
import { cleanText, OPTION_NAME_MAX, OPTION_VALUE_MAX, PRODUCT_LIMITS, STOCK_CHOICES, type VariantInput } from "../catalogue-options";

/** A gallery photo as the variants need it. */
export type VariantPhoto = { src: string; alt: string; blurDataURL: string };

type Group = { key: string; name: string; values: string[] };
/** A variant while editing: its choices keyed by option (so renaming an option keeps them), prices as typed. */
type Draft = Omit<VariantInput, "options"> & { values: Record<string, string> };

const NAME_SUGGESTIONS = ["Size", "Colour", "Frame", "Finish", "Material", "Paper", "Style"];

/** Enter inside the editor would send the whole product form half-done: keep it here. */
const keepEnter = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === "Enter") event.preventDefault();
};

const iconButton =
  "inline-flex size-[42px] shrink-0 items-center justify-center rounded-control border border-line-strong text-muted transition-colors duration-150 hover:border-error/50 hover:text-error";

/** A v4 id: crypto.randomUUID where the browser allows it (secure pages), else built from random bytes. */
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readPhotos(input: HTMLInputElement | null): VariantPhoto[] | null {
  if (!input) return null;
  try {
    const list: unknown = JSON.parse(input.value || "[]");
    if (!Array.isArray(list)) return null;
    return list.flatMap((item) => {
      const photo = (item ?? {}) as Partial<VariantPhoto>;
      return typeof photo.src === "string" ? [{ src: photo.src, alt: typeof photo.alt === "string" ? photo.alt : "", blurDataURL: typeof photo.blurDataURL === "string" ? photo.blurDataURL : "" }] : [];
    });
  } catch {
    return null;
  }
}

const samePhotos = (a: VariantPhoto[], b: VariantPhoto[]) => a.length === b.length && a.every((photo, index) => photo.src === b[index].src && photo.alt === b[index].alt);

/**
 * The photos in the same form's gallery field (ImageGalleryField sends them as JSON in a
 * hidden input), kept in step as photos are added, moved, described or removed. `sync`
 * re-reads on demand (e.g. when a photo menu opens), in case a change slipped past.
 */
function useGalleryPhotos(root: RefObject<HTMLElement | null>, field: string, initial: VariantPhoto[]) {
  const [photos, setPhotos] = useState(initial);
  const input = useRef<HTMLInputElement | null>(null);
  const sync = useCallback(() => {
    const next = readPhotos(input.current);
    if (next) setPhotos((current) => (samePhotos(current, next) ? current : next));
  }, []);
  useEffect(() => {
    const found = root.current?.closest("form")?.querySelector<HTMLInputElement>(`input[type="hidden"][name="${field}"]`) ?? null;
    input.current = found;
    if (!found) return;
    // A hidden input's value is its attribute, so every change React makes to it shows up here.
    const observer = new MutationObserver(sync);
    observer.observe(found, { attributes: true, attributeFilter: ["value"] });
    return () => observer.disconnect();
  }, [root, field, sync]);
  return { photos, sync };
}

/** Every combination of the options' choices, keyed by option. */
function combinations(groups: Group[]): Record<string, string>[] {
  return groups.reduce<Record<string, string>[]>((all, group) => all.flatMap((partial) => group.values.map((value) => ({ ...partial, [group.key]: value }))), [{}]);
}

/**
 * What "Create variants" makes: one variant per combination. A combination keeps the variant
 * that matches it exactly. When an option was added, the variant it extends carries over (id,
 * prices, stock, photo) to the first combination, and the others copy its prices, stock and
 * photo (SKUs stay unique, so theirs start blank). Variants that fit no combination (a choice
 * removed, a duplicate) are returned as `dropped`.
 */
function planVariants(groups: Group[], variants: Draft[], makeId: () => string): { next: Draft[]; dropped: Draft[] } {
  const candidates = variants.flatMap((variant) => {
    const known: Record<string, string> = {};
    for (const group of groups) {
      const value = variant.values[group.key];
      if (!value) continue;
      if (!group.values.includes(value)) return []; // one of its choices is gone
      known[group.key] = value;
    }
    const size = Object.keys(known).length;
    return size ? [{ variant, known, size }] : [];
  });
  const agrees = (known: Record<string, string>, values: Record<string, string>) => Object.entries(known).every(([key, value]) => values[key] === value);
  const used = new Set<string>();
  const combos = combinations(groups);
  // Exact matches first, so no variant is taken over by a combination it only partly matches.
  const exact = combos.map((values) => {
    const match = candidates.find((candidate) => candidate.size === groups.length && !used.has(candidate.variant.id) && agrees(candidate.known, values));
    if (match) used.add(match.variant.id);
    return match?.variant ?? null;
  });
  const next = combos.map((values, index): Draft => {
    const own = exact[index];
    if (own) return { ...own, values };
    // The most specific variant this combination extends (the list's order breaks ties).
    const parent = candidates.filter((candidate) => candidate.size < groups.length && agrees(candidate.known, values)).sort((a, b) => b.size - a.size)[0];
    if (!parent) return { id: makeId(), values, price: "", compareAtPrice: "", sku: "", stockStatus: "in_stock", imageSrc: "" };
    if (!used.has(parent.variant.id)) {
      used.add(parent.variant.id);
      return { ...parent.variant, values };
    }
    return { ...parent.variant, id: makeId(), sku: "", values };
  });
  return { next, dropped: variants.filter((variant) => !used.has(variant.id)) };
}

/** Why variants can't be made from these options yet, or null. */
function groupsProblem(groups: Group[]): string | null {
  const names: string[] = [];
  for (const group of groups) {
    const name = cleanText(group.name, OPTION_NAME_MAX);
    if (!name) return "Name each option first (for example Size).";
    if (group.values.length === 0) return `Add at least one choice to “${name}” first.`;
    if (names.includes(name.toLowerCase())) return `Two options are called “${name}”: give each its own name.`;
    names.push(name.toLowerCase());
  }
  return null;
}

/**
 * Options and variants for the product editor. Options are the choices a customer makes
 * (Size, Frame…), each with its values; "Create variants" makes one variant per combination,
 * keeping what was already set for combinations that still exist. Each variant can have its
 * own price, usual price, SKU, stock and photo (from the gallery above, read live from its
 * field). Sends `options` and `variants` as JSON; the server checks both again.
 */
export function VariantsEditor({
  defaultOptions,
  defaultVariants,
  defaultPhotos,
  photosField = "images",
}: {
  defaultOptions: { name: string; values: string[] }[];
  defaultVariants: VariantInput[];
  defaultPhotos: VariantPhoto[];
  /** The name of the gallery field in the same form. */
  photosField?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const suggestionsId = useId();
  const { photos, sync } = useGalleryPhotos(root, photosField, defaultPhotos);
  const [groups, setGroups] = useState<Group[]>(() => defaultOptions.map((option, index) => ({ key: `option-${index}`, name: option.name, values: option.values })));
  const [variants, setVariants] = useState<Draft[]>(() =>
    defaultVariants.map(({ options, ...variant }) => ({
      ...variant,
      values: Object.fromEntries(defaultOptions.map((option, index) => [`option-${index}`, options[option.name] ?? ""])),
    })),
  );
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [asking, setAsking] = useState<{ next: Draft[]; dropped: string[] } | null>(null);

  const keyOf = (values: Record<string, string>) => groups.map((group) => values[group.key] ?? "").join("\u0000");
  const fits = (values: Record<string, string>) => groups.every((group) => group.values.includes(values[group.key] ?? ""));
  const labelOf = (values: Record<string, string>) =>
    groups.map((group) => `${cleanText(group.name, OPTION_NAME_MAX) || "Option"}: ${values[group.key] || "—"}`).join(" · ");

  // Variants that no longer match: a choice gone, an option added, or two for the same combination.
  const seen = new Map<string, number>();
  for (const variant of variants) seen.set(keyOf(variant.values), (seen.get(keyOf(variant.values)) ?? 0) + 1);
  const invalid = new Set(variants.filter((variant) => !fits(variant.values) || (seen.get(keyOf(variant.values)) ?? 0) > 1).map((variant) => variant.id));
  const total = groups.length ? groups.reduce((count, group) => count * group.values.length, 1) : 0;
  const problem = groups.length ? groupsProblem(groups) : null;

  // ── Options ──
  const addGroup = () => {
    if (groups.length >= PRODUCT_LIMITS.optionGroups) return;
    setGroups([...groups, { key: newId(), name: "", values: [] }]);
    setNotice(null);
  };
  const updateGroup = (key: string, patch: Partial<Group>) => {
    setGroups((current) => current.map((group) => (group.key === key ? { ...group, ...patch } : group)));
    setNotice(null);
  };
  const removeGroup = (key: string) => {
    const next = groups.filter((group) => group.key !== key);
    setGroups(next);
    // No options means no variants: they exist only as combinations of choices.
    if (next.length === 0) setVariants([]);
    setNotice(null);
  };

  // ── Variants ──
  const apply = (next: Draft[]) => {
    const added = next.filter((variant) => !variants.some((old) => old.id === variant.id)).length;
    const removed = variants.filter((old) => !next.some((variant) => variant.id === old.id)).length;
    setVariants(next);
    setAsking(null);
    const parts = [added ? `added ${added}` : "", removed ? `removed ${removed}` : ""].filter(Boolean).join(" and ");
    setNotice({
      tone: "info",
      text: parts ? `Done: ${parts}. ${next.length} variant${next.length === 1 ? "" : "s"} in all. Leave a price blank to use the product's price.` : "The variants already match the options.",
    });
  };

  const rebuild = () => {
    if (problem) return setNotice({ tone: "error", text: problem });
    if (total > PRODUCT_LIMITS.variants) {
      return setNotice({ tone: "error", text: `That makes ${total} combinations; a product can have up to ${PRODUCT_LIMITS.variants}. Remove some choices.` });
    }
    const { next, dropped } = planVariants(groups, variants, newId);
    if (dropped.length) setAsking({ next, dropped: dropped.map((old) => labelOf(old.values)) });
    else apply(next);
  };

  const changeVariant = useCallback((id: string, patch: Partial<Draft>) => setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant))), []);
  const removeVariant = useCallback((id: string) => setVariants((current) => current.filter((variant) => variant.id !== id)), []);

  // ── What the form sends ──
  const optionsValue = JSON.stringify(groups.map((group) => ({ name: cleanText(group.name, OPTION_NAME_MAX), values: group.values })));
  const variantsValue = JSON.stringify(
    groups.length
      ? variants.map((variant) => ({
          id: variant.id,
          options: Object.fromEntries(groups.map((group) => [cleanText(group.name, OPTION_NAME_MAX), variant.values[group.key] ?? ""])),
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          sku: variant.sku,
          stockStatus: variant.stockStatus,
          imageSrc: variant.imageSrc,
        }))
      : [],
  );

  return (
    <div ref={root} className="grid min-w-0 gap-6">
      <input type="hidden" name="options" value={optionsValue} />
      <input type="hidden" name="variants" value={variantsValue} />

      <div className="grid min-w-0 gap-3">
        <div className="flex items-center gap-1.5">
          <span className={fieldLabelClass}>Options</span>
          <FieldHelp
            label="Options"
            help={`The choices a customer makes, like Size or Frame colour (up to ${PRODUCT_LIMITS.optionGroups}). Type each choice and press Enter. Then press “Create variants” to make one variant for every combination.`}
            example="Size: 8×10 in, 12×18 in"
          />
        </div>
        {groups.length === 0 ? (
          <p className="text-sm leading-6 text-muted">No options yet. Add one if customers choose a size, colour or frame.</p>
        ) : (
          <ol className="grid min-w-0 gap-3">
            {groups.map((group, index) => (
              <li key={group.key} className="grid min-w-0 gap-4 rounded-card border border-line bg-surface p-3 sm:p-4">
                <div className="flex min-w-0 items-end gap-2">
                  <DashboardField label={`Option ${index + 1}`} className="flex-1">
                    <DashboardInput
                      value={group.name}
                      onChange={(event) => updateGroup(group.key, { name: event.target.value })}
                      list={suggestionsId}
                      onKeyDown={keepEnter}
                      placeholder="e.g. Size"
                      maxLength={OPTION_NAME_MAX}
                      autoComplete="off"
                    />
                  </DashboardField>
                  <button
                    type="button"
                    onClick={() => removeGroup(group.key)}
                    aria-label={`Remove the option ${cleanText(group.name, OPTION_NAME_MAX) || index + 1}`}
                    title="Remove this option"
                    className={iconButton}
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>
                <DashboardField as="div" label="Choices" hint="Type a choice and press Enter (or paste several, separated by commas).">
                  <ValuesInput name={cleanText(group.name, OPTION_NAME_MAX) || `option ${index + 1}`} values={group.values} onChange={(values) => updateGroup(group.key, { values })} />
                </DashboardField>
              </li>
            ))}
          </ol>
        )}
        <datalist id={suggestionsId}>
          {NAME_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <div className="flex flex-wrap items-center gap-3">
          {groups.length < PRODUCT_LIMITS.optionGroups ? (
            <DashboardButton onClick={addGroup}>
              <Plus size={15} aria-hidden /> Add an option
            </DashboardButton>
          ) : null}
          {groups.length > 0 ? (
            <DashboardButton onClick={rebuild}>
              <Layers size={15} aria-hidden /> Create variants
            </DashboardButton>
          ) : null}
          {total > 0 && !problem ? (
            <span className="text-xs text-muted">
              {total} combination{total === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        {notice ? (
          <p role={notice.tone === "error" ? "alert" : "status"} className={`text-sm leading-6 ${notice.tone === "error" ? "text-error" : "text-success"}`}>
            {notice.text}
          </p>
        ) : null}
      </div>

      {groups.length > 0 ? (
        <div className="grid min-w-0 gap-3">
          <div className="flex items-center gap-1.5">
            <span className={fieldLabelClass}>Variants ({variants.length})</span>
            <FieldHelp
              label="Variants"
              help="One for each combination of choices. Leave Price blank to use the product's price; Usual price is the price before a discount. A variant's photo is shown when a customer picks it. Remove a variant if that combination isn't made: it can't be ordered."
            />
          </div>
          {invalid.size > 0 ? (
            <Warning>
              {invalid.size === 1 ? "One variant doesn't" : `${invalid.size} variants don't`} match the options any more (marked in red). Press “Create variants” to update the
              list: prices you&apos;ve set carry over wherever they still fit.
            </Warning>
          ) : null}
          {variants.length === 0 ? (
            <p className="text-sm leading-6 text-muted">
              No variants: customers pick from the choices above, and the product&apos;s own price and stock apply to every choice. Press “Create variants” to give each
              combination its own price, stock or photo.
            </p>
          ) : (
            <ol className="grid min-w-0 gap-3">
              {variants.map((variant) => (
                <VariantRow
                  key={variant.id}
                  draft={variant}
                  label={labelOf(variant.values)}
                  invalid={invalid.has(variant.id)}
                  photos={photos}
                  onChange={changeVariant}
                  onRemove={removeVariant}
                  onPhotosOpen={sync}
                />
              ))}
            </ol>
          )}
          {variants.length > 0 && invalid.size === 0 && !problem && variants.length < total ? (
            <p className="text-xs leading-5 text-muted">
              {variants.length} of {total} combinations have a variant; the others can&apos;t be ordered. “Create variants” adds them back.
            </p>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={asking !== null}
        onClose={() => setAsking(null)}
        title="Rebuild the variants?"
        message={
          asking ? (
            <>
              {asking.dropped.length === 1 ? "This variant will be removed" : `These ${asking.dropped.length} variants will be removed`}: {asking.dropped.slice(0, 5).join("; ")}
              {asking.dropped.length > 5 ? `; and ${asking.dropped.length - 5} more` : ""}. They no longer fit the options (a choice was removed, or two now have the same
              choices). The rest keep their prices. Nothing is saved until you save the product.
            </>
          ) : null
        }
        confirmLabel="Rebuild"
        danger
        onConfirm={() => {
          if (asking) apply(asking.next);
        }}
      />
    </div>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-card border border-error/50 bg-error/10 px-3 py-2.5 text-sm leading-6 text-error">
      <TriangleAlert size={15} aria-hidden className="mt-1 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** A small labelled cell of a variant row. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className={fieldLabelClass}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

const VariantRow = memo(function VariantRow({
  draft,
  label,
  invalid,
  photos,
  onChange,
  onRemove,
  onPhotosOpen,
}: {
  draft: Draft;
  label: string;
  invalid: boolean;
  photos: VariantPhoto[];
  onChange: (id: string, patch: Partial<Draft>) => void;
  onRemove: (id: string) => void;
  onPhotosOpen: () => void;
}) {
  const photoIndex = draft.imageSrc ? photos.findIndex((photo) => photo.src === draft.imageSrc) : -1;
  const photo = photoIndex >= 0 ? photos[photoIndex] : null;
  return (
    <li className={`min-w-0 rounded-card border bg-surface p-3 sm:p-4 ${invalid ? "border-error/50" : "border-line"}`}>
      <div className="flex min-w-0 items-start gap-3">
        <p className="min-w-0 flex-1 break-words pt-2 text-sm font-medium leading-6 text-strong">{label}</p>
        {invalid ? (
          <StatusBadge tone="red" className="mt-2.5">
            Doesn&apos;t match
          </StatusBadge>
        ) : null}
        <button type="button" onClick={() => onRemove(draft.id)} aria-label={`Remove the variant ${label}`} title="Remove this variant" className={iconButton}>
          <X size={15} aria-hidden />
        </button>
      </div>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.1fr)_minmax(0,1.5fr)]">
        <Cell label="Price">
          <DashboardInput inputMode="decimal" value={draft.price} onChange={(event) => onChange(draft.id, { price: event.target.value })} onKeyDown={keepEnter} placeholder="Product price" autoComplete="off" />
        </Cell>
        <Cell label="Usual price">
          <DashboardInput inputMode="decimal" value={draft.compareAtPrice} onChange={(event) => onChange(draft.id, { compareAtPrice: event.target.value })} onKeyDown={keepEnter} placeholder="No discount" autoComplete="off" />
        </Cell>
        <Cell label="SKU">
          <DashboardInput value={draft.sku} onChange={(event) => onChange(draft.id, { sku: event.target.value })} onKeyDown={keepEnter} placeholder="Product SKU" maxLength={100} autoComplete="off" spellCheck={false} />
        </Cell>
        <Cell label="Stock">
          <DashboardSelect value={draft.stockStatus} onChange={(event) => onChange(draft.id, { stockStatus: event.target.value as StockStatus })}>
            {STOCK_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.short}
              </option>
            ))}
          </DashboardSelect>
        </Cell>
        <Cell label="Photo">
          <span className="flex min-w-0 items-center gap-2">
            <span className="relative grid size-[42px] shrink-0 place-items-center overflow-hidden rounded-control border border-line-strong bg-raised text-muted">
              {photo ? (
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="42px"
                  placeholder={photo.blurDataURL ? "blur" : "empty"}
                  blurDataURL={photo.blurDataURL || undefined}
                  className="object-cover"
                />
              ) : (
                <ImageOff size={14} aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <DashboardSelect value={photo ? draft.imageSrc : ""} onFocus={onPhotosOpen} onPointerDown={onPhotosOpen} onChange={(event) => onChange(draft.id, { imageSrc: event.target.value })}>
                <option value="">{photos.length ? "No photo of its own" : "No photos yet"}</option>
                {photos.map((option, index) => (
                  <option key={option.src} value={option.src}>
                    {`Photo ${index + 1}${index === 0 ? " (main)" : ""}${option.alt ? ` · ${option.alt.slice(0, 40)}` : ""}`}
                  </option>
                ))}
              </DashboardSelect>
            </span>
          </span>
        </Cell>
      </div>
    </li>
  );
});

/**
 * An option's choices as chips: type and press Enter (or a comma) to add, × or Backspace to
 * remove, paste a comma-separated list to add several. Duplicates (any capitalisation) are
 * skipped. Enter never submits the product form from here.
 */
function ValuesInput({ name, values, onChange }: { name: string; values: string[]; onChange: (values: string[]) => void }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  const add = (raw: string) => {
    const parts = raw
      .split(/[,\n]/)
      .map((part) => cleanText(part, OPTION_VALUE_MAX))
      .filter(Boolean);
    setText("");
    if (parts.length === 0) return setNote("");
    const next = [...values];
    let skipped = false;
    for (const part of parts) {
      if (next.length >= PRODUCT_LIMITS.optionValues) break;
      if (next.some((value) => value.toLowerCase() === part.toLowerCase())) skipped = true;
      else next.push(part);
    }
    if (next.length !== values.length) onChange(next);
    setNote(next.length >= PRODUCT_LIMITS.optionValues && parts.length > next.length - values.length ? `Up to ${PRODUCT_LIMITS.optionValues} choices.` : skipped ? "Already there." : "");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(text);
    } else if (event.key === "Backspace" && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!/[,\n]/.test(pasted)) return;
    event.preventDefault();
    add(`${text}${pasted}`);
  };

  return (
    <div>
      <div className="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-control border border-line-strong bg-raised px-2 py-1.5 transition-colors duration-150 focus-within:border-primary">
        {values.map((value, index) => (
          <span key={value} className="inline-flex max-w-full items-center gap-1 rounded-full border border-line-strong bg-surface py-0.5 pl-2.5 pr-0.5 text-xs text-strong">
            <span className="truncate">{value}</span>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, at) => at !== index))}
              aria-label={`Remove ${value}`}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:text-error"
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setNote("");
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => add(text)}
          maxLength={OPTION_VALUE_MAX}
          placeholder={values.length ? "Add another" : "e.g. 8×10 in"}
          aria-label={`Add a choice to ${name}`}
          enterKeyHint="done"
          autoComplete="off"
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-strong outline-none placeholder:text-muted/70 supports-[-webkit-touch-callout:none]:text-base"
        />
      </div>
      {note ? (
        <p role="status" className="mt-1.5 text-xs leading-5 text-muted">
          {note}
        </p>
      ) : null}
    </div>
  );
}
