/**
 * Serialize JSON-LD for a <script> tag. Escapes `<` so a value containing
 * "</script>" can't close the tag early.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
