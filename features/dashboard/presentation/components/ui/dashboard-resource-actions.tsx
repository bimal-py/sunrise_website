import type { ReactNode } from "react";
import { DashboardButton } from "./dashboard-button";

/**
 * A list row's buttons, as on the portfolio: Edit, Preview (the public page, in a new tab;
 * pass it only for items the public can see), anything extra, then Delete, which asks in a
 * dialog first and spins while the delete runs.
 */
export function DashboardResourceActions({
  editHref,
  previewHref,
  deleteAction,
  deleteFields = {},
  deleteLabel = "Delete",
  deleteConfirm,
  children,
}: {
  editHref?: string;
  previewHref?: string;
  /** The server action the Delete form posts to. */
  deleteAction?: (formData: FormData) => void | Promise<void>;
  /** Hidden fields sent with Delete, e.g. { id }. */
  deleteFields?: Record<string, string>;
  deleteLabel?: string;
  /** The question Delete asks. Defaults to "Delete?" / "This can't be undone." */
  deleteConfirm?: { title: string; message: ReactNode };
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {editHref ? <DashboardButton href={editHref}>Edit</DashboardButton> : null}
      {previewHref ? (
        <DashboardButton href={previewHref} newTab>
          Preview
        </DashboardButton>
      ) : null}
      {children}
      {deleteAction ? (
        <form action={deleteAction}>
          {Object.entries(deleteFields).map(([field, value]) => (
            <input key={field} type="hidden" name={field} value={value} />
          ))}
          <DashboardButton
            type="submit"
            variant="danger"
            confirm={{
              title: deleteConfirm?.title ?? `${deleteLabel}?`,
              message: deleteConfirm?.message ?? "This can't be undone.",
              confirmLabel: deleteLabel,
            }}
          >
            {deleteLabel}
          </DashboardButton>
        </form>
      ) : null}
    </div>
  );
}
