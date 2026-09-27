export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query param, trimmed; undefined when absent or blank. */
export function firstParam(params: SearchParams, key: string): string | undefined {
  const raw = params[key];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value ? value : undefined;
}
