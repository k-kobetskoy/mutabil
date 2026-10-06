/**
 * Photos are re-encoded through a canvas before they are stored: this drops EXIF (GPS, device),
 * applies the camera orientation and caps the size (decisions D27, R6). Videos are kept as is.
 */
export async function cleanPhoto(file: Blob, maxSide: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality));
}

export const isVideo = (type: string) => type.startsWith('video/');
