/** Photo types the dashboard's uploadImage action accepts. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
/** uploadImage's limit (a server action request is capped at 4.5 MB). */
export const MAX_PHOTO_BYTES = 4_400_000;

const MAX_SIDE = 2560;

/**
 * Big camera photos are shrunk in the browser first, as the dashboard's image fields do
 * (features/dashboard/presentation/components/image-field.tsx): faster on mobile data,
 * and under the upload limit. Small ones go as they are.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3_500_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.9));
}
