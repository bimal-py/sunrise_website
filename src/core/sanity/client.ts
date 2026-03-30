import { createClient } from "@sanity/client";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION ?? "2025-01-01";

export const isSanityConfigured = Boolean(projectId && dataset);

export const sanityClient = isSanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      perspective: "published"
    })
  : null;

export const fetchSanityOrFallback = async <T>(
  query: string,
  fallback: T,
  params: Record<string, unknown> = {}
) => {
  if (!sanityClient) {
    return fallback;
  }

  try {
    const result = await sanityClient.fetch<T | null>(query, params);
    return result ?? fallback;
  } catch (error) {
    console.error("Sanity fetch failed. Falling back to local content.", error);
    return fallback;
  }
};
