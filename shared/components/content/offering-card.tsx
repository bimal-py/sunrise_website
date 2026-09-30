import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Offering } from "@/shared/domain/offering";
import { AfBrackets } from "@/shared/components/ui/af-brackets";
import { OfferingIcon } from "./offering-icon";

/** Service or print tile: icon, name (+ Nepali), summary, optional fact. The whole card is one link; the autofocus brackets snap on when it's pointed at. */
export function OfferingCard({ offering, href, meta }: { offering: Offering; href: string; meta?: string }) {
  return (
    <article className="af-card group relative flex h-full flex-col rounded-card border border-line bg-surface p-6 transition-colors duration-150 hover:border-line-strong">
      <AfBrackets />
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong">
        <OfferingIcon name={offering.icon} />
      </span>
      <h3 className="mt-5 text-lg leading-snug group-hover:text-primary">
        {/* Stretched link: the whole card is clickable, one link in the markup. */}
        <Link href={href} className="after:absolute after:inset-0">
          {offering.name}
        </Link>
      </h3>
      <p lang="ne" className="text-sm text-muted">
        {offering.nameNe}
      </p>
      <p className="mt-3 line-clamp-3 text-sm text-muted">{offering.summary}</p>
      <p className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
        <span className="text-foreground">{meta}</span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          Details <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </p>
    </article>
  );
}
