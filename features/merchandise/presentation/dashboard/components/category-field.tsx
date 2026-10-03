"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { DashboardField, DashboardSelect } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { FormDialog } from "@/features/dashboard/presentation/components/ui/modal";
import { createCategoryInline } from "../actions/categories";
import { merchandisePaths } from "../catalogue-options";

type CategoryOption = { id: string; name: string; published: boolean };

/**
 * The product's category: a select of the categories, "New category" (a one-field dialog
 * that creates it without leaving the form, then selects it) and "Manage categories" (the
 * categories page, in a new tab so nothing typed here is lost). Sends `category_id`.
 */
export function CategoryField({ categories, defaultValue }: { categories: CategoryOption[]; defaultValue: string | null }) {
  const [options, setOptions] = useState(categories);
  const [value, setValue] = useState(defaultValue && categories.some((category) => category.id === defaultValue) ? defaultValue : "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const create = (name: string) => {
    setError("");
    startTransition(async () => {
      const result = await createCategoryInline(name).catch(() => ({ ok: false as const, error: "Couldn't reach the server. Check your connection and try again." }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { category } = result;
      setOptions((current) => (current.some((option) => option.id === category.id) ? current : [...current, { ...category, published: true }]));
      setValue(category.id);
      setCreating(false);
    });
  };

  return (
    <div className="min-w-0">
      <DashboardField
        label="Category"
        help="Groups products in the shop's filter. A category shows in the shop once it's published and has a published product."
      >
        <DashboardSelect name="category_id" value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="">No category</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.published ? option.name : `${option.name} (hidden)`}
            </option>
          ))}
        </DashboardSelect>
      </DashboardField>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={() => {
            setError("");
            setCreating(true);
          }}
          className="inline-flex min-h-8 items-center gap-1 text-sm text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-strong hover:underline"
        >
          <Plus size={14} aria-hidden /> New category
        </button>
        <a
          href={merchandisePaths.categories()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center gap-1 text-sm text-muted underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline"
        >
          Manage categories <ArrowUpRight size={14} aria-hidden />
        </a>
      </div>
      <FormDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New category"
        description="It's created now and selected for this product. Add a description or photo later on the Categories page."
        label="Category name"
        placeholder="e.g. Photo frames"
        maxLength={120}
        submitLabel="Create category"
        pendingLabel="Creating…"
        pending={pending}
        error={error}
        onSubmit={create}
      />
    </div>
  );
}
