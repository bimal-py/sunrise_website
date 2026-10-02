import { ArrowUpRight } from "lucide-react";
import { QuietSubmit, SubmitButton } from "@/features/dashboard/presentation/components/form-controls";
import { Panel, rowLinkClass, StatusBadge } from "@/features/dashboard/presentation/components/ui";
import { turnOffIndexNow, turnOnIndexNow } from "@/features/root-files/presentation/actions/root-files";

/** Turns IndexNow on (a new key, served at /<key>.txt) or off. Saves elsewhere ping it (lib/seo/indexnow.ts). */
export function IndexNowPanel({ indexNowKey }: { indexNowKey: string }) {
  const keyFile = `/${indexNowKey}.txt`;
  return (
    <Panel
      title="IndexNow"
      description="Tells Bing (and Yandex, Seznam and Naver) the moment a film, service, print or post is added or changed, so it's recrawled within minutes instead of days. Google doesn't take part; it reads the sitemap."
      actions={indexNowKey ? <StatusBadge tone="green">On</StatusBadge> : <StatusBadge>Off</StatusBadge>}
    >
      {indexNowKey ? (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted">Key</dt>
            <dd className="break-all font-mono text-strong">{indexNowKey}</dd>
            <dt className="text-muted">Key file</dt>
            <dd>
              <a href={keyFile} target="_blank" rel="noopener noreferrer" className={`${rowLinkClass} break-all font-mono`}>
                {keyFile} <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            </dd>
          </dl>
          <p className="text-xs text-muted">Bing opens the key file to check the key is yours. The site serves it by itself; there&apos;s nothing to upload.</p>
          <form action={turnOffIndexNow} className="border-t border-line pt-4">
            <QuietSubmit>Turn off</QuietSubmit>
          </form>
        </div>
      ) : (
        <form action={turnOnIndexNow} className="flex flex-wrap items-center gap-4">
          <SubmitButton pendingLabel="Turning on…">Turn on</SubmitButton>
          <p className="text-xs text-muted">Creates a key and serves it at /&lt;key&gt;.txt. Nothing to set up at Bing.</p>
        </form>
      )}
    </Panel>
  );
}
