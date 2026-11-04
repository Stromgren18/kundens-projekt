/** Upload limits for customer attachments (shared by browser and server). */
export const MAX_FILES = 5;
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 700 * 1024;
export const TARGET_IMAGE_BYTES = 400 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_DIM = 2048;

export const isPdf = (type: string) => type === "application/pdf";
export const isPdfUrl = (url: string) => /\.pdf($|\?)/i.test(url);

/** Returns an error message if the selected file can't be accepted, else null. */
export function checkFile(f: { name: string; type: string; size: number }): string | null {
  if (isPdf(f.type)) return f.size > MAX_PDF_BYTES ? `${f.name} är för stor (max 10 MB för PDF)` : null;
  if (!f.type.startsWith("image/")) return `${f.name} stöds inte – bara bilder och PDF`;
  if (f.size > MAX_ORIGINAL_BYTES) return `${f.name} är för stor (max 25 MB)`;
  return null;
}

export const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} kB`);

/** Browser-only: scales to MAX_DIM and re-encodes as JPEG until under the target size. */
export async function compressImage(file: File): Promise<File> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error(`Kunde inte läsa bilden ${file.name}`);
  let scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  for (let i = 0; i < 8; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const q = Math.max(0.5, 0.82 - i * 0.06);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && (blob.size <= TARGET_IMAGE_BYTES || (i >= 3 && blob.size <= MAX_IMAGE_BYTES)))
      return new File([blob], name, { type: "image/jpeg" });
    if (i >= 2) scale *= 0.8;
  }
  throw new Error(`Bilden ${file.name} gick inte att göra mindre än 700 kB`);
}
