"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Trash2, X } from "lucide-react";
import { Field } from "@/features/dashboard/presentation/components/ui";
import { pictureLinks } from "@/features/file-manager/data/browser-storage";
import { STANDARD_WIDTHS, type Picture } from "@/features/file-manager/domain/entities";
import { CopyButton } from "@/features/file-manager/presentation/components/copy-button";
import { eyebrowClasses } from "@/shared/components/ui/section-heading";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

const chipClass =
  "inline-flex min-h-8 items-center gap-1 rounded-full border border-line-strong px-3 font-mono text-xs text-foreground transition-colors duration-150 hover:border-primary hover:text-primary";
const linkInputClass =
  "h-11 w-full min-w-0 rounded-control border border-line-strong bg-raised px-3 font-mono text-xs text-strong focus:border-primary focus:outline-none";

function LinkField({ label, hint, value }: { label: string; hint: string; value: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex gap-2">
        <input id={id} readOnly value={value} onFocus={(event) => event.currentTarget.select()} className={linkInputClass} />
        <CopyButton text={value} label="Copy" boxed ariaLabel={`Copy the ${label.toLowerCase()}`} />
      </div>
    </Field>
  );
}

/**
 * A photo's details (a native modal dialog: focus stays inside, Esc closes): its sizes,
 * the links to copy, Open and Delete.
 */
export function PhotoDialog({
  picture,
  busy,
  onClose,
  onDelete,
}: {
  picture: Picture;
  /** Another change is running: deleting waits for it. */
  busy: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null once the photo is gone (the parent then closes the dialog). */
  onDelete: (picture: Picture) => Promise<string | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const links = pictureLinks(picture);
  const share = picture.view === "share";
  const missing = share ? [] : STANDARD_WIDTHS.filter((width) => !picture.widths.includes(width));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // Links share a long start; show their ends (the file name, "-1280") instead.
    dialog.querySelectorAll("input").forEach((input) => {
      input.scrollLeft = input.scrollWidth;
    });
  }, []);

  async function remove() {
    const ask = `Delete ${picture.name}? Its sizes, its share image and its library entry go too. Pages that use this photo will lose it. This can't be undone.`;
    if (!window.confirm(ask)) return;
    setDeleting(true);
    setError("");
    const problem = await onDelete(picture);
    if (problem) {
      setError(problem);
      setDeleting(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dim backdrop (outside the panel) closes it.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-0 m-auto h-fit max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-panel border border-line-strong bg-surface p-0 text-foreground backdrop:bg-background/80"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={eyebrowClasses}>
              {share ? "Share image" : "Photo"} · {picture.collection}
            </p>
            <h2 id={titleId} className="mt-1 break-all font-mono text-base font-medium leading-snug text-strong">
              {picture.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:text-strong"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Capped so Open and Delete stay on screen on a laptop without scrolling the dialog. */}
        <div className="relative mt-4 aspect-[4/3] max-h-[40svh] w-full overflow-hidden rounded-card border border-line bg-raised">
          <Image src={links.preview} alt="" fill unoptimized sizes="(min-width: 704px) 624px, 100vw" className="object-contain" />
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-strong">{share ? "Share image" : "Sizes"}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {!share &&
              picture.widths.map((width) => (
                <li key={width}>
                  <a href={links.size(width)} target="_blank" rel="noopener noreferrer" className={chipClass}>
                    {width} px <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            <li>
              <a href={links.share} target="_blank" rel="noopener noreferrer" className={chipClass}>
                {share ? "1200 × 630 px" : "Share image · 1200 × 630"} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </li>
          </ul>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-error">No {missing.join(" or ")} px file. Upload the photo again to rebuild every size.</p>
          )}
          {share && (
            <p className="mt-2 text-xs text-muted">
              Shown when a page with this photo is shared on WhatsApp or Facebook. Its sizes are in the {picture.collection} folder.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {share ? (
            <LinkField label="Share image link" hint="The 1200 × 630 JPEG, for link previews." value={links.share} />
          ) : (
            <>
              <LinkField
                label="Site link"
                hint="For the site's photo fields: the site picks the right size from it. On its own it doesn't open in a browser."
                value={links.site}
              />
              <LinkField label={`Photo file (${links.fullWidth} px)`} hint="Opens anywhere: blog posts, WhatsApp, Facebook, email." value={links.full} />
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <SpriteButton variant="secondary" href={links.open}>
            Open <ArrowUpRight className="h-4 w-4" aria-hidden />
          </SpriteButton>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy || deleting}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-error underline-offset-4 transition-opacity duration-150 hover:underline disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleting ? "Deleting…" : "Delete photo"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
