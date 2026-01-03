import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'product-images';
const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.75;

type OptimizeOptions = {
  maxDimension?: number;
  quality?: number;
};

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });
}

function getScaledSize(width: number, height: number, maxDimension: number) {
  const maxSide = Math.max(width, height);
  if (maxSide <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / maxSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function compressImageBlob(blob: Blob, options?: OptimizeOptions) {
  if (blob.type === 'image/gif') {
    return blob;
  }

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const img = await loadImageFromBlob(blob);
  const { width, height } = getScaledSize(img.width, img.height, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return blob;
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = 'image/webp';
  const compressed = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, quality)
  );

  if (!compressed) return blob;
  return compressed.size < blob.size ? compressed : blob;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const match = header.match(/data:(.*?);base64/i);
  const mime = match?.[1] || 'application/octet-stream';
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function getExtension(type: string) {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg') return 'jpg';
  return 'bin';
}

async function uploadToStorage(blob: Blob) {
  const ext = getExtension(blob.type);
  const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, blob, {
    contentType: blob.type,
    upsert: false,
    cacheControl: '31536000',
  });

  if (error) return null;

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl || null;
}

export async function optimizeAndUploadImageFile(
  file: File,
  options?: OptimizeOptions
): Promise<string> {
  try {
    const compressed = await compressImageBlob(file, options);
    const publicUrl = await uploadToStorage(compressed);
    if (publicUrl) return publicUrl;
  } catch {
    // Fallback to base64 to preserve current behavior
  }
  return fileToDataUrl(file);
}

export async function optimizeAndUploadDataUrl(
  dataUrl: string,
  options?: OptimizeOptions
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const blob = dataUrlToBlob(dataUrl);
    const compressed = await compressImageBlob(blob, options);
    const publicUrl = await uploadToStorage(compressed);
    if (publicUrl) return publicUrl;
  } catch {
    // Keep the original data URL on failure
  }
  return dataUrl;
}
