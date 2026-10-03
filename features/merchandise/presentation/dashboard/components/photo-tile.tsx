import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { ImageAsset } from "@/shared/domain/image";

/** A list row's square photo (the product's main photo, a category's photo), or a quiet placeholder. */
export function PhotoTile({ image, alt = "" }: { image: ImageAsset | null | undefined; alt?: string }) {
  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-card border border-line bg-raised sm:size-24">
      {image ? (
        <Image
          src={image.src}
          alt={alt}
          fill
          sizes="96px"
          placeholder={image.blurDataURL ? "blur" : "empty"}
          blurDataURL={image.blurDataURL || undefined}
          className="object-cover"
        />
      ) : (
        <span className="grid size-full place-items-center text-muted" title="No photo yet">
          <ImageOff size={18} aria-hidden />
          <span className="sr-only">No photo yet</span>
        </span>
      )}
    </div>
  );
}
