import "server-only";
import type { ImageAsset } from "@/shared/domain/image";
import { supabaseUrl } from "@/lib/supabase/env";

/** Reading dashboard form fields: trimmed, length-capped, with simple types. */
export function str(formData: FormData, key: string, max = 500): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Like str() but keeps trailing spaces (WhatsApp messages that end in "Our date is: "). */
export function raw(formData: FormData, key: string, max = 2000): string {
  return String(formData.get(key) ?? "").replace(/^\s+/, "").slice(0, max);
}

export function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export function int(formData: FormData, key: string, fallback = 0): number {
  const value = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isFinite(value) ? value : fallback;
}

export function num(formData: FormData, key: string): number | null {
  const text = String(formData.get(key) ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** "Syangja, Walling" or one per line → ["Syangja", "Walling"]. */
export function list(formData: FormData, key: string, max = 50): string[] {
  return String(formData.get(key) ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Lines → array (keeps commas inside a line). */
export function lines(formData: FormData, key: string, max = 50): string[] {
  return String(formData.get(key) ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** An empty value, an http(s) URL, or an error message. */
export function url(formData: FormData, key: string): { value: string; error?: string } {
  const value = str(formData, key, 500);
  if (!value) return { value };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { value, error: "Use a link starting with https://" };
    return { value };
  } catch {
    return { value, error: "That doesn't look like a full link (https://…)." };
  }
}

/** An ImageField's JSON, accepted only if it points at our own files. */
export function image(formData: FormData, key: string): ImageAsset | null {
  const text = String(formData.get(key) ?? "");
  if (!text) return null;
  try {
    const value = JSON.parse(text) as ImageAsset;
    const ours = (src: string) => src.startsWith("/images/") || (Boolean(supabaseUrl) && src.startsWith(`${supabaseUrl}/storage/v1/object/public/media/`));
    if (typeof value.src !== "string" || !ours(value.src) || !ours(value.ogImage)) return null;
    if (!Number.isFinite(value.width) || !Number.isFinite(value.height)) return null;
    return { src: value.src, width: Math.round(value.width), height: Math.round(value.height), blurDataURL: String(value.blurDataURL ?? "").slice(0, 4000), ogImage: value.ogImage };
  } catch {
    return null;
  }
}
