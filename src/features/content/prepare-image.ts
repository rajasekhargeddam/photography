// Leave room below the provider's 10 MiB per-image limit.
export const WEBSITE_IMAGE_BYTES = 9 * 1024 * 1024;
export type PreparedImage = {
  file: File;
  optimized: boolean;
  width?: number;
  height?: number;
};

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Preparation paused. Retry to continue.');
}

/** Creates a separate sRGB website copy; never writes to the selected original. */
export async function prepareImage(
  file: File,
  signal: AbortSignal,
): Promise<PreparedImage> {
  checkAbort(signal);
  if (
    !file.size ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  )
    throw new Error('Choose a non-empty JPEG, PNG or WebP photo.');
  if (file.size <= WEBSITE_IMAGE_BYTES) return { file, optimized: false };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      colorSpaceConversion: 'default',
    });
  } catch {
    throw new Error(
      'This photo could not be prepared on this device. Export a smaller JPEG, PNG or WebP and select it again.',
    );
  }
  const canvas = document.createElement('canvas');
  try {
    checkAbort(signal);
    if (!bitmap.width || !bitmap.height)
      throw new Error('This photo has invalid dimensions.');
    // Bound canvas memory; only one large photo is prepared at a time by the UI.
    const scale = Math.min(
      1,
      6000 / Math.max(bitmap.width, bitmap.height),
      Math.sqrt(24_000_000 / (bitmap.width * bitmap.height)),
    );
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const mime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    for (let step = 0; step < 12; step++) {
      checkAbort(signal);
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { colorSpace: 'srgb' });
      if (!context)
        throw new Error(
          'Image preparation is unavailable in this browser. Try an updated browser.',
        );
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.94, 0.88, 0.82]) {
        checkAbort(signal);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, mime, quality),
        );
        checkAbort(signal);
        if (!blob)
          throw new Error(
            'This device could not create a website copy. Try a smaller exported photo.',
          );
        if (blob.size && blob.size <= WEBSITE_IMAGE_BYTES) {
          // Some browsers fall back to PNG when WebP encoding is unavailable.
          const ext =
            blob.type === 'image/png'
              ? 'png'
              : blob.type === 'image/webp'
                ? 'webp'
                : 'jpg';
          return {
            file: new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '') + '-web.' + ext,
              { type: blob.type, lastModified: file.lastModified },
            ),
            optimized: true,
            width,
            height,
          };
        }
      }
      width = Math.max(1, Math.floor(width * 0.8));
      height = Math.max(1, Math.floor(height * 0.8));
    }
    throw new Error(
      'Unable to prepare this photo below the upload limit. Export a smaller copy and select it again.',
    );
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 1;
  }
}
