import Image from "next/image";
import Link from "next/link";
import { getSiteSettings } from "@/features/site/data/settings.repository";

/** The round logo mark + "Sunrise Photo Studio" wordmark with the Nepali name, linking home. */
export async function Logo({ size = "md", className = "" }: { size?: "md" | "lg"; className?: string }) {
  const site = await getSiteSettings();
  const px = size === "lg" ? 56 : 40;
  return (
    <Link href="/" className={`inline-flex items-center gap-3 ${className}`} aria-label={`${site.name}: home`}>
      <Image
        src={size === "lg" ? "/brand/logo-160.png" : "/brand/logo-80.png"}
        alt=""
        width={px}
        height={px}
        unoptimized
        style={{ width: px, height: px }}
      />
      <span className="flex flex-col">
        <span className={`font-semibold leading-tight text-strong ${size === "lg" ? "text-lg" : "text-[15px]"}`}>{site.name}</span>
        <span lang="ne" className="text-xs leading-tight text-muted">
          {site.nameNe}
        </span>
      </span>
    </Link>
  );
}
