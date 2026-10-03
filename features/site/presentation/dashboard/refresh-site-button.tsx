"use client";

import { useActionState } from "react";
import { refreshWholeSite } from "@/features/dashboard/presentation/actions/settings";
import { idle } from "@/features/dashboard/presentation/components/ui/action-state";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { FormStatus } from "@/features/dashboard/presentation/components/ui/form-status";

/**
 * Settings → "Refresh every page": asks first (each page then rebuilds on its next visit),
 * spins with the top bar while it runs, and says when it's done.
 */
export function RefreshSiteButton() {
  const [state, action] = useActionState(refreshWholeSite, idle);
  return (
    <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <DashboardButton
        type="submit"
        confirm={{
          title: "Refresh every page?",
          message: "Each page is rebuilt on its next visit. Only needed after changing content straight in Supabase: saving in the dashboard already does this.",
          confirmLabel: "Refresh every page",
          pendingLabel: "Refreshing…",
        }}
      >
        Refresh every page
      </DashboardButton>
      <FormStatus state={state} />
    </form>
  );
}
