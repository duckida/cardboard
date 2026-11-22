export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  filename: string;
  contentType: string;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through
    }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

export async function compressImage(
  file: File,
  maxDim = 2560,
  quality = 0.82,
): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  const sourceW = 'width' in bitmap ? bitmap.width : 0;
  const sourceH = 'height' in bitmap ? bitmap.height : 0;
  if (!sourceW || !sourceH) throw new Error('That image has no dimensions.');

  const scale = Math.min(1, maxDim / Math.max(sourceW, sourceH));
  const width = Math.max(1, Math.round(sourceW * scale));
  const height = Math.max(1, Math.round(sourceH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not encode that image.'))),
      'image/webp',
      quality,
    );
  });

  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return {
    blob,
    width,
    height,
    filename: `${base}.webp`,
    contentType: 'image/webp',
  };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read blob.'));
    reader.readAsDataURL(blob);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return blobToDataUrl(blob).then((data) => data.split(',')[1] ?? '');
}
