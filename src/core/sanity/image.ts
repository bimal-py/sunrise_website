import imageUrlBuilder from "@sanity/image-url";

import { sanityClient } from "@/core/sanity/client";

const builder = sanityClient ? imageUrlBuilder(sanityClient) : null;

export const buildImageUrl = (source: string | Record<string, unknown> | undefined) => {
  if (!source) {
    return undefined;
  }

  if (typeof source === "string") {
    return source;
  }

  return builder?.image(source).width(1600).auto("format").url();
};
