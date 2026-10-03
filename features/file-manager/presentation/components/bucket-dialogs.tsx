"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { MAX_FILE_BYTES, type StorageBucket } from "@/features/file-manager/domain/entities";
import { dashboardButtonClass } from "@/features/dashboard/presentation/components/ui/button-classes";
import { DashboardCheckbox, DashboardField, DashboardInput } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { Modal } from "@/features/dashboard/presentation/components/ui/modal";
import { useProgressWhile } from "@/features/dashboard/presentation/components/ui/use-progress-while";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { bucketSlug } from "./file-manager-model";

export type BucketSettingsInput = { public: boolean; allowedMimeTypes: string; fileSizeLimitMb: string };

function Actions({ pending, label, pendingLabel, onClose }: { pending: boolean; label: string; pendingLabel: string; onClose: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button type="button" onClick={onClose} disabled={pending} className={dashboardButtonClass("ghost")}>
        Cancel
      </button>
      <SpriteButton type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 size={15} className="animate-spin" aria-hidden />
            {pendingLabel}
          </>
        ) : (
          label
        )}
      </SpriteButton>
    </div>
  );
}

function ErrorLine({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="text-sm leading-6 text-error">
      {error}
    </p>
  ) : null;
}

/** "Create new bucket": a name, and whether anyone with a link may open its files. */
export function NewBucketDialog({
  open,
  pending,
  error,
  onClose,
  onCreate,
}: {
  open: boolean;
  pending: boolean;
  error: string;
  onClose: () => void;
  onCreate: (name: string, isPublic: boolean) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Create new bucket" size="sm" dismissible={!pending}>
      <NewBucketForm pending={pending} error={error} onClose={onClose} onCreate={onCreate} />
    </Modal>
  );
}

function NewBucketForm({ pending, error, onClose, onCreate }: { pending: boolean; error: string; onClose: () => void; onCreate: (name: string, isPublic: boolean) => void }) {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  useProgressWhile(pending);
  const slug = bucketSlug(name);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (slug.length < 2) return setProblem("Use at least two letters or digits.");
    onCreate(slug, new FormData(event.currentTarget).get("public") === "on");
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <DashboardField
        label="Bucket name"
        required
        error={problem || undefined}
        hint={slug && slug !== name.trim() ? `It will be called “${slug}”.` : "Lowercase letters, digits, hyphens and underscores."}
      >
        <DashboardInput
          data-autofocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setProblem("");
          }}
          placeholder="e.g. client-deliveries"
          maxLength={63}
          autoComplete="off"
          disabled={pending}
          aria-invalid={problem ? true : undefined}
        />
      </DashboardField>
      <DashboardCheckbox
        name="public"
        label="Public bucket (files are readable by anyone with the link)"
        hint="Leave it unticked for private documents: their files then open only from here, through links that last an hour."
        disabled={pending}
      />
      <ErrorLine error={error} />
      <Actions pending={pending} label="Create bucket" pendingLabel="Creating…" onClose={onClose} />
    </form>
  );
}

/** "Bucket settings": public or private, the file types it takes and the largest file. */
export function EditBucketDialog({
  open,
  bucket,
  pending,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  bucket: StorageBucket | null;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSave: (settings: BucketSettingsInput) => void;
}) {
  return (
    <Modal open={open && bucket !== null} onClose={onClose} title={`Bucket settings: ${bucket?.label ?? ""}`} size="sm" dismissible={!pending}>
      {bucket ? <EditBucketForm bucket={bucket} pending={pending} error={error} onClose={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

function EditBucketForm({
  bucket,
  pending,
  error,
  onClose,
  onSave,
}: {
  bucket: StorageBucket;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSave: (settings: BucketSettingsInput) => void;
}) {
  useProgressWhile(pending);
  const limitMb = bucket.fileSizeLimit ? String(Math.round((bucket.fileSizeLimit / 1_048_576) * 100) / 100) : "";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    onSave({
      // A disabled box isn't sent: Photos and Files always stay public.
      public: bucket.protected || data.get("public") === "on",
      allowedMimeTypes: String(data.get("allowedMimeTypes") ?? ""),
      fileSizeLimitMb: String(data.get("fileSizeLimitMb") ?? ""),
    });
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <DashboardCheckbox
        name="public"
        label="Public bucket (files readable by anyone with the link)"
        defaultChecked={bucket.public}
        disabled={pending || bucket.protected}
        hint={bucket.protected ? "The site serves from this bucket, so it stays public, and it can't be deleted." : undefined}
      />
      <DashboardField
        label="Allowed file types"
        help="Only files of these types can be uploaded here. Leave it blank to allow any kind of file."
        example="image/*, application/pdf"
        hint="Comma-separated media types, or blank for any."
      >
        <DashboardInput
          data-autofocus
          name="allowedMimeTypes"
          defaultValue={(bucket.allowedMimeTypes ?? []).join(", ")}
          placeholder="Any"
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
        />
      </DashboardField>
      <DashboardField
        label="Max file size (MB)"
        help={`The largest file this bucket takes. Uploads from the dashboard are also capped at ${Math.round(MAX_FILE_BYTES / 1_048_576)} MB a file.`}
        example="25"
        hint="Per file. Blank = no limit."
      >
        <DashboardInput name="fileSizeLimitMb" inputMode="decimal" defaultValue={limitMb} placeholder="No limit" autoComplete="off" disabled={pending} />
      </DashboardField>
      <p className="text-xs leading-5 text-muted">
        These are the bucket&apos;s own settings. Who may read or change its files is set by the database&apos;s access rules.
      </p>
      <ErrorLine error={error} />
      <Actions pending={pending} label="Save settings" pendingLabel="Saving…" onClose={onClose} />
    </form>
  );
}
