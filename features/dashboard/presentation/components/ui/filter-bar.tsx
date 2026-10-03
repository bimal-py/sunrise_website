"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { DashboardCard, DashboardField, DashboardInput, DashboardSelect } from "./dashboard-ui";
import { useProgressWhile } from "./use-progress-while";

export type FilterField = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** The value in force now (from the page's search params). */
  defaultValue: string;
};

/**
 * A list page's filter card, as on the portfolio: labelled selects (and a search box) in a
 * row that wraps on phones, then the gold Apply button. Apply loads the list with the chosen
 * filters in the address (empty ones left out, back to page 1); the gold top bar runs and the
 * button spins until the list has loaded. Without JavaScript it is a plain GET form.
 */
export function DashboardFilterBar({
  action,
  fields,
  search,
  hidden = {},
}: {
  /** The list's own path, e.g. routes.dashboardSection("films"). */
  action: string;
  fields: FilterField[];
  search?: { name: string; placeholder: string; defaultValue?: string };
  /** Other params to keep (e.g. a view the filters don't show). */
  hidden?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useProgressWhile(pending);

  // Re-mount when the page's values change (back/forward, a link), so the controls show them.
  const formKey = JSON.stringify([fields.map((field) => field.defaultValue), search?.defaultValue ?? "", hidden]);

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim()) params.append(name, value.trim());
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `${action}?${query}` : action));
  };

  return (
    <DashboardCard className="p-4">
      <form key={formKey} method="get" action={action} onSubmit={apply} role="search" className="flex flex-wrap items-end gap-3">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {search ? (
          <DashboardField label="Search" className="min-w-[min(100%,14rem)] flex-1">
            <DashboardInput type="search" name={search.name} defaultValue={search.defaultValue ?? ""} placeholder={search.placeholder} enterKeyHint="search" />
          </DashboardField>
        ) : null}
        {fields.map((field) => (
          <DashboardField key={field.name} label={field.label}>
            <DashboardSelect name={field.name} defaultValue={field.defaultValue}>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </DashboardSelect>
          </DashboardField>
        ))}
        <SpriteButton type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Loading…
            </>
          ) : (
            "Apply"
          )}
        </SpriteButton>
      </form>
    </DashboardCard>
  );
}
