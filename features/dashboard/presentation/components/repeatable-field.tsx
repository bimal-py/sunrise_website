"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { inputClass, labelClass, textareaClass } from "./ui";

type Column = { key: string; label: string; kind?: "text" | "textarea" | "lines"; hint?: string };
type Row = Record<string, string>;

/**
 * An ordered list of small records (page sections, FAQs, print sizes), edited inline and
 * sent as JSON in a hidden input named `name`. "lines" columns are one item per line and
 * arrive as string arrays.
 */
export function RepeatableField({
  name,
  label,
  columns,
  defaultValue,
  addLabel,
  hint,
}: {
  name: string;
  label: string;
  columns: Column[];
  defaultValue: Record<string, unknown>[];
  addLabel: string;
  hint?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    defaultValue.map((row) => Object.fromEntries(columns.map((c) => [c.key, Array.isArray(row[c.key]) ? (row[c.key] as string[]).join("\n") : String(row[c.key] ?? "")]))),
  );
  const value = JSON.stringify(
    rows.map((row) => Object.fromEntries(columns.map((c) => [c.key, c.kind === "lines" ? row[c.key].split("\n").map((s) => s.trim()).filter(Boolean) : row[c.key]]))),
  );
  const update = (index: number, key: string, text: string) => setRows((all) => all.map((row, i) => (i === index ? { ...row, [key]: text } : row)));
  const move = (index: number, by: number) =>
    setRows((all) => {
      const next = [...all];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });
  const iconButton = "flex size-9 items-center justify-center rounded-control border border-line-strong text-muted transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-30";

  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{label}</legend>
      {hint && <p className="-mt-1 mb-3 text-xs text-muted">{hint}</p>}
      <input type="hidden" name={name} value={value} />
      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li key={index} className="rounded-card border border-line bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{String(index + 1).padStart(2, "0")}</span>
              <div className="flex gap-1.5">
                <button type="button" className={iconButton} onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" className={iconButton} onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label="Move down">
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" className={`${iconButton} hover:border-error hover:text-error`} onClick={() => setRows((all) => all.filter((_, i) => i !== index))} aria-label="Remove">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div className="grid gap-3">
              {columns.map((column) => (
                <label key={column.key} className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    {column.label}
                    {column.hint && <span className="font-normal"> · {column.hint}</span>}
                  </span>
                  {column.kind === "textarea" || column.kind === "lines" ? (
                    <textarea rows={column.kind === "lines" ? 4 : 3} value={row[column.key]} onChange={(e) => update(index, column.key, e.target.value)} className={textareaClass} />
                  ) : (
                    <input value={row[column.key]} onChange={(e) => update(index, column.key, e.target.value)} className={inputClass} />
                  )}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => setRows((all) => [...all, Object.fromEntries(columns.map((c) => [c.key, ""]))])}
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-strong"
      >
        <Plus className="h-4 w-4" aria-hidden /> {addLabel}
      </button>
    </fieldset>
  );
}
