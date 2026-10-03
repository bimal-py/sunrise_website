"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ImageOff, Loader2, Search, X } from "lucide-react";
import { MaskIcon } from "@/shared/components/ui/mask-icon";
import { previewIcon } from "../../actions/icons";
import { dashboardButtonClass } from "./button-classes";
import { DashboardField, DashboardInput } from "./dashboard-ui";
import { useProgressWhile } from "./use-progress-while";

/** Iconify ids offered before anything is typed: outline icons that suit a photo studio. */
export const STUDIO_ICON_SUGGESTIONS = [
  "lucide:camera",
  "lucide:video",
  "lucide:aperture",
  "lucide:clapperboard",
  "lucide:film",
  "lucide:image",
  "lucide:images",
  "lucide:album",
  "lucide:frame",
  "lucide:printer",
  "lucide:heart",
  "lucide:gift",
  "lucide:crown",
  "lucide:gem",
  "lucide:flower-2",
  "lucide:sparkles",
  "lucide:party-popper",
  "lucide:cake",
  "lucide:baby",
  "lucide:users",
  "lucide:drum",
  "lucide:music",
  "lucide:palette",
  "lucide:award",
];

/** Brand marks for social links (Simple Icons, single colour). */
export const SOCIAL_ICON_SUGGESTIONS = [
  "simple-icons:facebook",
  "simple-icons:instagram",
  "simple-icons:youtube",
  "simple-icons:tiktok",
  "simple-icons:x",
  "simple-icons:linkedin",
  "simple-icons:whatsapp",
  "simple-icons:viber",
  "simple-icons:messenger",
  "simple-icons:threads",
  "simple-icons:pinterest",
  "lucide:globe",
];

const ICONIFY = "https://api.iconify.design";
const ID = /^[a-z0-9-]+:[a-z0-9-]+$/;
/** Sets that are all animation (the site only takes still icons). */
const ANIMATED_SETS = new Set(["line-md", "svg-spinners"]);

/** An Iconify icon drawn as a mask in the text colour, straight from Iconify (dashboard previews only). */
function RemoteIcon({ id, className = "size-5" }: { id: string; className?: string }) {
  const url = `url("${ICONIFY}/${id.replace(":", "/")}.svg")`;
  const style: CSSProperties = { maskImage: url, WebkitMaskImage: url, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" };
  return <span aria-hidden className={`inline-block shrink-0 bg-current ${className}`} style={style} />;
}

type Preview = { source: string; svg: string };

/**
 * The portfolio's icon field: a preview, a text field for an Iconify id ("mdi:camera") or a
 * pasted https link to an SVG, and "Browse icons", which searches Iconify's 200,000+ icons
 * (single-colour sets only) with a row of suggestions before anything is typed. Picking an
 * icon fills the field. Only the text is sent (under `name`); the server fetches and cleans
 * the icon when the form is saved. The preview here comes from the same server check, so it
 * shows exactly what will be saved, in the site's gold, or why it can't be used.
 */
export function IconPickerField({
  name = "icon_source",
  label,
  defaultValue,
  defaultSvg,
  required,
  help,
  example,
  hint,
  suggestions = STUDIO_ICON_SUGGESTIONS,
}: {
  name?: string;
  label: string;
  defaultValue?: string | null;
  /** The saved icon's markup (icon_svg), to preview without asking the server. */
  defaultSvg?: string | null;
  required?: boolean;
  help?: ReactNode;
  example?: string;
  hint?: ReactNode;
  /** Iconify ids shown before a search (default: studio icons; SOCIAL_ICON_SUGGESTIONS for social links). */
  suggestions?: string[];
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState<Preview | null>(defaultValue && defaultSvg ? { source: defaultValue, svg: defaultSvg } : null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const checkId = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  useProgressWhile(checking);

  async function check(source: string) {
    const text = source.trim();
    const id = ++checkId.current;
    if (!text) {
      setPreview(null);
      setError("");
      setChecking(false);
      return;
    }
    if (preview && (preview.source === text || preview.source === text.toLowerCase())) return;
    setChecking(true);
    setError("");
    const result = await previewIcon(text).catch(() => ({ ok: false as const, error: "Couldn't reach the server. Check your connection." }));
    if (id !== checkId.current) return;
    setChecking(false);
    if (result.ok) {
      setPreview({ source: result.source, svg: result.svg });
      setValue(result.source);
    } else {
      setPreview(null);
      setError(result.error);
    }
  }

  const pick = (id: string) => {
    setValue(id);
    setOpen(false);
    setQuery("");
    void check(id);
  };

  // Iconify search: waits for a pause in typing, cancels the previous request, single-colour sets only.
  useEffect(() => {
    const text = query.trim();
    if (!open || text.length < 2) return; // below two letters the suggestions show instead
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchFailed(false);
      try {
        const response = await fetch(`${ICONIFY}/search?query=${encodeURIComponent(`${text} palette:false`)}&limit=72`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { icons?: unknown };
        const icons = Array.isArray(data.icons) ? data.icons.filter((icon): icon is string => typeof icon === "string" && ID.test(icon) && !ANIMATED_SETS.has(icon.split(":")[0])) : [];
        setResults(icons);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchFailed(true);
      }
      setSearching(false);
    }, 320);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const typed = query.trim().length >= 2;
  const grid = typed ? results : suggestions;

  return (
    <DashboardField as="div" label={label} required={required} help={help} example={example} hint={hint} error={error}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-[42px] shrink-0 place-items-center overflow-hidden rounded-control border border-line-strong bg-raised text-primary" aria-hidden>
          {checking ? (
            <Loader2 size={16} className="animate-spin text-muted" />
          ) : preview ? (
            <MaskIcon svg={preview.svg} className="size-5" />
          ) : ID.test(value.trim()) && !error ? (
            <RemoteIcon id={value.trim()} />
          ) : (
            <ImageOff size={15} className="text-muted" />
          )}
        </span>
        <div className="relative min-w-0 flex-1">
          <DashboardInput
            name={name}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
            onBlur={() => void check(value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void check(value);
            }}
            placeholder="Search below, or paste an icon id or SVG link"
            aria-label={label}
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            spellCheck={false}
            className={value ? "pr-10" : ""}
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                void check("");
              }}
              aria-label="Remove the icon"
              title="Remove the icon"
              className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:text-error"
            >
              <X size={15} aria-hidden />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen((current) => !current);
            if (!open) window.setTimeout(() => searchRef.current?.focus(), 0);
          }}
          className={dashboardButtonClass("ghost", "px-3 pointer-coarse:min-w-11")}
        >
          {open ? <X size={14} aria-hidden /> : <Search size={14} aria-hidden />}
          {/* On phones the button is just its icon, so the text field keeps its room. */}
          <span className="sr-only sm:not-sr-only">{open ? "Close" : "Browse icons"}</span>
        </button>
      </div>

      {open ? (
        <div className="mt-3 rounded-card border border-line-strong bg-background p-3">
          <DashboardInput
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            placeholder="Search icons, e.g. camera, wedding, heart, instagram"
            aria-label="Search icons"
          />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {typed ? (searching ? "Searching…" : `${results.length} found`) : "Suggestions"}
          </p>
          <div className="mt-2 max-h-56 overflow-y-auto pr-1">
            {typed && !searching && results.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                {searchFailed ? "The icon library didn't answer. Try again, or paste an SVG link above." : "No icons found. Try another word, or paste an SVG link above."}
              </p>
            ) : (
              <div className={`grid grid-cols-6 gap-2 sm:grid-cols-9 ${searching ? "opacity-60" : ""}`}>
                {grid.map((id) => (
                  <button
                    key={id}
                    type="button"
                    title={id}
                    aria-label={id}
                    aria-pressed={value === id}
                    onClick={() => pick(id)}
                    className={`grid aspect-square min-h-10 place-items-center rounded-control border transition-colors duration-150 hover:border-primary hover:text-primary ${value === id ? "border-primary text-primary" : "border-line-strong text-strong"}`}
                  >
                    <RemoteIcon id={id} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            Icons from Iconify (single colour; they take the site&apos;s colours). Animated icons can&apos;t be used.
          </p>
        </div>
      ) : null}
    </DashboardField>
  );
}
