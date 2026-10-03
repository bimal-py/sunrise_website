import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardSubmitButton } from "@/features/dashboard/presentation/components/ui/dashboard-submit-button";
import { DashboardCard, StatusBadge } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { turnOffIndexNow, turnOnIndexNow } from "@/features/root-files/presentation/actions/root-files";

/** Turns IndexNow on (a new key, served at /<key>.txt) or off. Saves elsewhere ping it (lib/seo/indexnow.ts). */
export function IndexNowPanel({ indexNowKey }: { indexNowKey: string }) {
  const keyFile = `/${indexNowKey}.txt`;
  return (
    <DashboardCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h2 className="font-display text-[26px] font-semibold leading-tight text-strong">IndexNow</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Tells Bing (and Yandex, Seznam and Naver) the moment a film, service, print, product or post is added or changed, so it&apos;s recrawled within minutes instead of
            days. Google doesn&apos;t take part; it reads the sitemap.
          </p>
        </div>
        <StatusBadge tone={indexNowKey ? "gold" : "muted"}>{indexNowKey ? "On" : "Off"}</StatusBadge>
      </div>

      {indexNowKey ? (
        <div className="mt-5 grid gap-4">
          <dl className="grid gap-x-4 gap-y-2 rounded-card border border-line bg-raised px-4 py-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="font-mono text-[11px] uppercase leading-6 tracking-[0.16em] text-primary">Key</dt>
            <dd className="break-all font-mono text-strong">{indexNowKey}</dd>
            <dt className="font-mono text-[11px] uppercase leading-6 tracking-[0.16em] text-primary">Key file</dt>
            <dd className="break-all font-mono text-strong">{keyFile}</dd>
          </dl>
          <p className="text-xs leading-5 text-muted">Bing opens the key file to check the key is yours. The site serves it by itself; there&apos;s nothing to upload.</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <DashboardButton href={keyFile} newTab prefetch={false}>
              Open key file ↗
            </DashboardButton>
            <form action={turnOffIndexNow}>
              <DashboardButton
                type="submit"
                variant="danger"
                confirm={{
                  title: "Turn IndexNow off?",
                  message: "Bing goes back to finding changes on its own schedule. Turning it on again makes a new key.",
                  confirmLabel: "Turn off",
                  pendingLabel: "Turning off…",
                }}
              >
                Turn off
              </DashboardButton>
            </form>
          </div>
        </div>
      ) : (
        <form action={turnOnIndexNow} className="mt-5 flex flex-wrap items-center gap-4">
          <DashboardSubmitButton pendingLabel="Turning on…">Turn on</DashboardSubmitButton>
          <p className="text-xs leading-5 text-muted">Creates a key and serves it at /&lt;key&gt;.txt. Nothing to set up at Bing.</p>
        </form>
      )}
    </DashboardCard>
  );
}
