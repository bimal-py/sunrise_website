/**
 * The portfolio dashboard's second button style (DashboardButton), shared by the button itself
 * and the dialogs' Cancel buttons. A dashboard-only exception to "SpriteButton only": primary
 * actions stay SpriteButtons; these are the bordered secondary (ghost) and destructive (danger)
 * buttons. 38px tall with a mouse, as on the portfolio; 44px on touch screens.
 */
export type DashboardButtonVariant = "ghost" | "danger";

const BASE =
  "inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 py-2 text-sm font-medium transition-colors duration-150 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<DashboardButtonVariant, string> = {
  ghost: "border border-line-strong text-strong hover:border-primary hover:text-primary",
  danger: "border border-error/50 text-error hover:bg-error/10",
};

export function dashboardButtonClass(variant: DashboardButtonVariant = "ghost", className = "") {
  return `${BASE} ${VARIANTS[variant]} ${className}`;
}
