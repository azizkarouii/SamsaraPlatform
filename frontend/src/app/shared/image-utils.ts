import { environment } from '../../environments/environment';

export const MAX_PROPERTY_IMAGES = 10;
/** Limit enforced by the server on each file. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Larger originals are refused before even trying to decode them. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

export function imageUrl(imagePath: string | null | undefined): string | null {
  return imagePath ? `${environment.apiUrl}/uploads/${imagePath}` : null;
}

export type ImageCheckError = 'image_type_invalid' | 'image_too_large';

export function checkImageFile(file: File): ImageCheckError | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'image_type_invalid';
  if (file.size > MAX_SOURCE_BYTES) return 'image_too_large';
  return null;
}

/**
 * Downscales a photo (1600px by default, less for avatars) and re-encodes it (WebP, JPEG as fallback) before upload:
 * a 6 MB phone picture becomes ~200-400 KB, which keeps uploads and pages fast.
 * The original is kept when it is already small and re-encoding would not help.
 */
export async function compressImage(file: File, maxDimension = 1600): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await toBlob(canvas, 'image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, 'image/jpeg', 0.85);
  }
  if (!blob || (blob.size >= file.size && file.size <= MAX_IMAGE_BYTES)) {
    return file;
  }
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}.${extension}`, { type: blob.type });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}
