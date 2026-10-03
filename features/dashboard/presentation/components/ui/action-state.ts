/**
 * What every dashboard server action returns to its form (DashboardForm): a status
 * and one plain sentence for the line beside the save button. Success usually redirects instead
 * (to the list, with ?saved=<label>), so a returned success is for forms that stay put (Settings).
 */
export type ActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };

export const idle: ActionState = { status: "idle" };
