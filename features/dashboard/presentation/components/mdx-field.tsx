"use client";

import { useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { Bold, Heading2, ImagePlus, Languages, Link2, Loader2 } from "lucide-react";
import type { MediaCollection } from "@/lib/media/process-image";
import { dashboardButtonClass } from "./ui/button-classes";
import { controlClass, fieldLabelClass } from "./ui/dashboard-ui";
import { FieldHelp } from "./ui/field-help";
import { FilePickerDialog } from "./ui/file-picker-dialog";
import { imageFiles, uploadPhoto } from "./ui/photo-prep";
import { useProgressWhile } from "./ui/use-progress-while";

type Range = { start: number; end: number };

/**
 * A Markdown (MDX) body (a blog post, a product's description) in a plain text area, with
 * buttons for the few things people need: a heading, bold, a link, a Nepali phrase
 * (<Ne>…</Ne>) and a photo. "Photo" opens the file picker (the photo library, or upload
 * there); a photo can also be dragged onto the text or pasted (a screenshot): it's shrunk,
 * given the site's sizes (in `collection`'s folder) and inserted where the cursor is as
 * ![description](link). `toc` says whether the page builds "On this page" from the headings.
 */
export function MdxField({
  name,
  label,
  defaultValue,
  help,
  required,
  collection = "blog",
  toc = true,
}: {
  name: string;
  label: string;
  defaultValue: string;
  help?: ReactNode;
  required?: boolean;
  collection?: MediaCollection;
  toc?: boolean;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const saved = useRef<Range | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [picking, setPicking] = useState(false);
  useProgressWhile(busy);

  const insert = (before: string, after = "", placeholder = "") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end) || placeholder;
    el.setRangeText(`${before}${selected}${after}`, start, end, "end");
    el.focus();
  };

  /**
   * Puts ![alt](src) on its own lines at `at` (or the cursor) and returns where it ends. With no
   * description and `waitInBrackets`, the cursor is left between the brackets to type one.
   */
  const insertPhoto = (src: string, alt: string, at?: Range | null, waitInBrackets = true): number => {
    const el = area.current;
    if (!el) return 0;
    const start = at?.start ?? el.selectionStart;
    const end = at?.end ?? el.selectionEnd;
    const before = el.value.slice(0, start);
    const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const description = alt.replace(/[[\]\r\n]+/g, " ").trim();
    const markup = `${lead}![${description}](${src})\n\n`;
    el.focus();
    el.setRangeText(markup, start, end, "end");
    if (!description && waitInBrackets) {
      const caret = start + lead.length + 2;
      el.setSelectionRange(caret, caret);
      setNote("Photo added. Type a short description of it between the [ ] (for people who can't see it, and for search).");
    } else {
      setNote(description ? "" : "Photos added. Type a short description of each between its [ ].");
    }
    return start + markup.length;
  };

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError("");
    setNote("");
    const problems: string[] = [];
    const el = area.current;
    let at: Range | null = el ? { start: el.selectionStart, end: el.selectionEnd } : null;
    for (const [index, file] of files.entries()) {
      setStatus(files.length > 1 ? `Uploading ${index + 1} of ${files.length}…` : "Uploading the photo…");
      const result = await uploadPhoto(file, collection);
      if (result.ok) {
        const after = insertPhoto(result.image.src, "", at, files.length === 1);
        at = { start: after, end: after };
      } else {
        problems.push(`${file.name}: ${result.error}`);
      }
    }
    setBusy(false);
    setStatus("");
    if (problems.length > 0) setError(problems.join(" "));
  }

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    setDragging(false);
    const files = imageFiles(event.dataTransfer.files);
    if (files.length === 0) return; // text and links drop as usual
    event.preventDefault();
    void uploadFiles(files);
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = imageFiles(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    void uploadFiles(files);
  };

  const tool = dashboardButtonClass("ghost", "px-3");
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-1.5">
        <label htmlFor={name} className={fieldLabelClass}>
          {label}
          {required ? (
            <sup aria-hidden className="ml-0.5 text-[0.85em] text-error" title="Required">
              *
            </sup>
          ) : null}
        </label>
        {help ? <FieldHelp help={help} label={label} /> : null}
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className={tool} onClick={() => insert("\n## ", "\n", "Heading")}>
          <Heading2 size={15} aria-hidden /> Heading
        </button>
        <button type="button" className={tool} onClick={() => insert("**", "**", "bold text")}>
          <Bold size={15} aria-hidden /> Bold
        </button>
        <button type="button" className={tool} onClick={() => insert("[", "](/services/wedding-photography)", "link text")}>
          <Link2 size={15} aria-hidden /> Link
        </button>
        <button type="button" className={tool} onClick={() => insert("<Ne>", "</Ne>", "नेपाली")}>
          <Languages size={15} aria-hidden /> Nepali
        </button>
        <button
          type="button"
          className={tool}
          disabled={busy}
          onClick={() => {
            const el = area.current;
            saved.current = el ? { start: el.selectionStart, end: el.selectionEnd } : null;
            setPicking(true);
          }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />}
          {busy ? "Uploading…" : "Photo"}
        </button>
      </div>
      <textarea
        ref={area}
        id={name}
        name={name}
        rows={22}
        defaultValue={defaultValue}
        spellCheck
        onDragEnter={(event) => {
          if (event.dataTransfer.types.includes("Files")) setDragging(true);
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onPaste={onPaste}
        aria-describedby={`${name}-help`}
        className={`${controlClass} min-h-28 resize-y font-mono text-[13px] leading-6 ${dragging ? "border-primary bg-primary-soft" : ""}`}
      />
      <div id={`${name}-help`} className="mt-1.5 text-xs leading-5">
        {error ? (
          <p role="alert" className="text-error">
            {error}
          </p>
        ) : status ? (
          <p role="status" className="text-strong">
            {status}
          </p>
        ) : note ? (
          <p role="status" className="text-primary">
            {note}
          </p>
        ) : (
          <p className="text-muted">
            Markdown: <code>## Heading</code>, <code>**bold**</code>, <code>- list item</code>, <code>[text](/page)</code>. Nepali words go inside <code>&lt;Ne&gt;…&lt;/Ne&gt;</code>.
            Photos: the Photo button, or drag one onto the text, or paste a screenshot (shrunk automatically).
            {toc ? " “On this page” is built from the ## and ### headings." : null}
          </p>
        )}
      </div>
      <FilePickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        mode="image"
        collection={collection}
        onPick={(result) => {
          if (result.kind !== "image") return;
          insertPhoto(result.image.src, result.image.alt ?? "", saved.current);
          saved.current = null;
        }}
      />
    </div>
  );
}
