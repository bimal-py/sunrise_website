"use client";

import { useRef, useState } from "react";
import { Bold, Heading2, ImagePlus, Languages, Link2 } from "lucide-react";
import { uploadImage } from "../actions/media";
import { useProgressWhile } from "./form-controls";
import { labelClass, monoTextareaClass } from "./ui";

/**
 * The post body: Markdown (MDX) in a plain text area, with buttons for the few things
 * people need: a heading, bold, a link, a Nepali phrase (<Ne>…</Ne>) and a photo (uploaded
 * and sized like every other photo, then inserted where the cursor is).
 */
export function MdxField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useProgressWhile(busy);

  const insert = (before: string, after = "", placeholder = "") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end) || placeholder;
    el.setRangeText(`${before}${selected}${after}`, start, end, "end");
    el.focus();
  };

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    const alt = window.prompt("Describe the photo in a few words (for people who can't see it):", "")?.trim() ?? "";
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("collection", "blog");
      body.set("alt", alt);
      const result = await uploadImage(body);
      if (result.ok) insert(`\n\n![${alt.replace(/[[\]]/g, "")}](${result.image.src})\n\n`);
      else setError(result.error);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const tool = "inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line-strong px-2.5 text-sm text-foreground transition-colors duration-150 hover:border-primary hover:text-primary";
  return (
    <div className="min-w-0">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className={tool} onClick={() => insert("\n## ", "\n", "Heading")}>
          <Heading2 className="h-4 w-4" aria-hidden /> Heading
        </button>
        <button type="button" className={tool} onClick={() => insert("**", "**", "bold text")}>
          <Bold className="h-4 w-4" aria-hidden /> Bold
        </button>
        <button type="button" className={tool} onClick={() => insert("[", "](/services/wedding-photography)", "link text")}>
          <Link2 className="h-4 w-4" aria-hidden /> Link
        </button>
        <button type="button" className={tool} onClick={() => insert("<Ne>", "</Ne>", "नेपाली")}>
          <Languages className="h-4 w-4" aria-hidden /> Nepali
        </button>
        <label className={`${tool} cursor-pointer has-[:focus-visible]:border-primary`}>
          <ImagePlus className="h-4 w-4" aria-hidden /> {busy ? "Uploading…" : "Photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => { void addPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <textarea ref={area} id={name} name={name} rows={22} defaultValue={defaultValue} spellCheck className={monoTextareaClass} />
      {error ? (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">
          Markdown: <code>## Heading</code>, <code>**bold**</code>, <code>- list item</code>, <code>[text](/page)</code>. Nepali words go inside <code>&lt;Ne&gt;…&lt;/Ne&gt;</code>. “On this page” is built from the ## and ### headings.
        </p>
      )}
    </div>
  );
}
