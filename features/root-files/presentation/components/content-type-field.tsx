"use client";

import { useRef, useState } from "react";
import { DashboardInput, DashboardSelect } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ROOT_FILE_TYPES } from "@/features/root-files/domain/root-file";

const OTHER = "__other__";

/**
 * The portfolio's content-type picker: a list of common types, or "Other" to type one.
 * Sends `content_type` either way: a hidden input for a listed type, the text box otherwise.
 * Uncontrolled; give it a new `key` to start it again with another value.
 */
export function ContentTypeField({ defaultValue, label = "Content type", onChange }: { defaultValue: string; label?: string; onChange?: (value: string) => void }) {
  const listed = ROOT_FILE_TYPES.some((type) => type.value === defaultValue);
  const [custom, setCustom] = useState(!listed && defaultValue.length > 0);
  const [preset, setPreset] = useState<string>(listed ? defaultValue : ROOT_FILE_TYPES[0].value);
  const typed = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-2">
      <DashboardSelect
        aria-label={label}
        value={custom ? OTHER : preset}
        onChange={(event) => {
          if (event.target.value === OTHER) {
            setCustom(true);
            onChange?.(typed.current?.value ?? "");
            // Straight into the text box that appears.
            requestAnimationFrame(() => typed.current?.focus());
          } else {
            setCustom(false);
            setPreset(event.target.value);
            onChange?.(event.target.value);
          }
        }}
      >
        {ROOT_FILE_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
        <option value={OTHER}>Other (type a MIME type)…</option>
      </DashboardSelect>
      {custom ? (
        <DashboardInput
          ref={typed}
          name="content_type"
          aria-label={`${label} (typed)`}
          defaultValue={listed ? "" : defaultValue}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder="e.g. application/wasm"
          maxLength={120}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          className="font-mono"
        />
      ) : (
        <input type="hidden" name="content_type" value={preset} />
      )}
    </div>
  );
}
