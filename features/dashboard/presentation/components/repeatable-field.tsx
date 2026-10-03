"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { controlClass, DashboardField } from "./ui/dashboard-ui";

type Column = {
  key: string;
  label: string;
  /** text (one line), textarea (a paragraph) or lines (one item per line, sent as a list). */
  kind?: "text" | "textarea" | "lines";
  hint?: string;
  placeholder?: string;
  maxLength?: number;
};
type Row = { key: number; values: Record<string, string> };

const iconButton =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-line-strong text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong disabled:hover:text-muted pointer-coarse:size-11";

/**
 * An ordered list of small records (page sections, questions, print sizes, specifications),
 * edited in place: each in its own box with move up/down and remove, and a dashed "Add"
 * button under them. Sent as JSON in a hidden input named `name`; "lines" columns are one item
 * per line and arrive as string arrays. Nothing is saved until the form is.
 */
export function RepeatableField({
  name,
  label,
  columns,
  defaultValue,
  addLabel,
  hint,
  help,
  example,
  itemLabel = "Item",
  max = 30,
}: {
  name: string;
  label: string;
  columns: Column[];
  defaultValue: Record<string, unknown>[];
  addLabel: string;
  hint?: ReactNode;
  /** What the list is for, in the "?" note beside the label. */
  help?: ReactNode;
  example?: string;
  /** What one entry is called, for screen readers ("Section 2"). */
  itemLabel?: string;
  max?: number;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (defaultValue ?? []).slice(0, max).map((row, index) => ({
      key: index,
      values: Object.fromEntries(columns.map((c) => [c.key, Array.isArray(row[c.key]) ? (row[c.key] as unknown[]).map(String).join("\n") : String(row[c.key] ?? "")])),
    })),
  );
  const nextKey = useRef(rows.length);

  const value = JSON.stringify(
    rows.map((row) =>
      Object.fromEntries(
        columns.map((c) => [
          c.key,
          c.kind === "lines"
            ? row.values[c.key]
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean)
            : row.values[c.key],
        ]),
      ),
    ),
  );

  const update = (key: number, column: string, text: string) =>
    setRows((all) => all.map((row) => (row.key === key ? { ...row, values: { ...row.values, [column]: text } } : row)));
  const move = (index: number, by: -1 | 1) =>
    setRows((all) => {
      const target = index + by;
      if (target < 0 || target >= all.length) return all;
      const next = [...all];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const remove = (key: number) => setRows((all) => all.filter((row) => row.key !== key));
  const add = () => {
    if (rows.length >= max) return;
    const key = nextKey.current++;
    setRows((all) => [...all, { key, values: Object.fromEntries(columns.map((c) => [c.key, ""])) }]);
  };

  return (
    <DashboardField as="div" label={label} help={help} example={example} hint={hint}>
      <input type="hidden" name={name} value={value} />
      {rows.length > 0 ? (
        <ol className="grid gap-3">
          {rows.map((row, index) => {
            const number = String(index + 1).padStart(2, "0");
            return (
              <li key={row.key} aria-label={`${itemLabel} ${index + 1}`} className="min-w-0 rounded-card border border-line-strong bg-raised p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{number}</span>
                  <div className="flex gap-1.5">
                    <button type="button" className={iconButton} onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`} title="Move up">
                      <ArrowUp size={15} aria-hidden />
                    </button>
                    <button type="button" className={iconButton} onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`} title="Move down">
                      <ArrowDown size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`${iconButton} hover:border-error/50 hover:text-error`}
                      onClick={() => remove(row.key)}
                      aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                      title="Remove"
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {columns.map((column) => (
                    <label key={column.key} className="block min-w-0">
                      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        {column.label}
                        {column.hint ? <span className="normal-case tracking-normal"> · {column.hint}</span> : null}
                      </span>
                      {column.kind === "textarea" || column.kind === "lines" ? (
                        <textarea
                          rows={column.kind === "lines" ? 4 : 3}
                          value={row.values[column.key]}
                          onChange={(event) => update(row.key, column.key, event.target.value)}
                          placeholder={column.placeholder}
                          maxLength={column.maxLength}
                          className={`${controlClass} resize-y leading-6`}
                        />
                      ) : (
                        <input
                          value={row.values[column.key]}
                          onChange={(event) => update(row.key, column.key, event.target.value)}
                          onKeyDown={(event) => {
                            // Enter in a row's field shouldn't send the whole form.
                            if (event.key === "Enter") event.preventDefault();
                          }}
                          placeholder={column.placeholder}
                          maxLength={column.maxLength}
                          className={controlClass}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
      <button
        type="button"
        onClick={add}
        disabled={rows.length >= max}
        className={`${rows.length > 0 ? "mt-3" : ""} flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-line-strong px-4 py-3 text-sm text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <Plus size={15} aria-hidden /> {addLabel}
      </button>
    </DashboardField>
  );
}
