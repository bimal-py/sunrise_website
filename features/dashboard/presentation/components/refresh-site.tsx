"use client";

import { useActionState } from "react";
import { refreshWholeSite } from "../actions/settings";
import { FormStatus, idle, SubmitButton } from "./form-controls";

export function RefreshSite() {
  const [state, action] = useActionState(refreshWholeSite, idle);
  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      <SubmitButton variant="secondary" pendingLabel="Refreshing…">
        Refresh every page
      </SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}
