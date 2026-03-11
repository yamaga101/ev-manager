const MAX_SIZE = 800 * 1024; // 800KB
const MAX_DIMENSION = 1920;

export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.8;
  let base64 = canvas.toDataURL("image/jpeg", quality);

  // Reduce quality until under MAX_SIZE
  while (base64.length * 0.75 > MAX_SIZE && quality > 0.3) {
    quality -= 0.1;
    base64 = canvas.toDataURL("image/jpeg", quality);
  }

  // Strip data URL prefix, return raw base64
  return base64.replace(/^data:image\/jpeg;base64,/, "");
}
