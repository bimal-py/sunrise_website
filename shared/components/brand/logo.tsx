import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

/** The round logo mark + "Sunrise Photo Studio" wordmark with the Nepali name, linking home. */
export function Logo({ size = "md", className = "" }: { size?: "md" | "lg"; className?: string }) {
  const px = size === "lg" ? 56 : 40;
  return (
    <Link href="/" className={`inline-flex items-center gap-3 ${className}`} aria-label={`${siteConfig.name}: home`}>
      <Image
        src={size === "lg" ? "/brand/logo-160.png" : "/brand/logo-80.png"}
        alt=""
        width={px}
        height={px}
        unoptimized
        style={{ width: px, height: px }}
      />
      <span className="flex flex-col">
        <span className={`font-semibold leading-tight text-strong ${size === "lg" ? "text-lg" : "text-[15px]"}`}>{siteConfig.name}</span>
        <span lang="ne" className="text-xs leading-tight text-muted">
          {siteConfig.nameNe}
        </span>
      </span>
    </Link>
  );
}
