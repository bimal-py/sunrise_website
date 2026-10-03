import type { ActionState } from "./action-state";

/** The one line beside a form's save button: "Saved." in green, or what went wrong in red. */
export function FormStatus({ state, className = "" }: { state: ActionState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;
  const failed = state.status === "error";
  return (
    <p role={failed ? "alert" : "status"} className={`text-sm leading-6 ${failed ? "text-error" : "text-success"} ${className}`}>
      {state.message}
    </p>
  );
}
