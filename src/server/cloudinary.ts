import { createHash } from 'node:crypto';
import { ApiFailure } from './enquiries';
import { MAX_IMAGE_BYTES } from '../features/content/model';

const PREFIX = 'my-dream-photography/';
export function cloudinaryConfig() {
  try {
    const url = new URL(process.env.CLOUDINARY_URL ?? '');
    if (
      url.protocol !== 'cloudinary:' ||
      !url.username ||
      !url.password ||
      !/^[a-z0-9_-]+$/i.test(url.hostname)
    )
      throw new Error();
    return {
      cloud: url.hostname,
      key: decodeURIComponent(url.username),
      secret: decodeURIComponent(url.password),
    };
  } catch {
    throw new ApiFailure(
      503,
      'Cloudinary configuration is missing or invalid.',
    );
  }
}
export function managedPublicId(id: string) {
  return `${PREFIX}${id}`;
}
export function isManagedPublicId(id: string) {
  return /^my-dream-photography\/[a-f0-9-]{36}$/.test(id);
}
function signFields(fields: Record<string, string>, secret: string) {
  return createHash('sha256')
    .update(
      Object.entries(fields)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => key + '=' + value)
        .join('&') + secret,
    )
    .digest('hex');
}
export function imageUploadGrant(publicId: string) {
  if (!isManagedPublicId(publicId))
    throw new ApiFailure(400, 'Invalid managed asset.');
  const config = cloudinaryConfig();
  const fields = {
    public_id: publicId,
    overwrite: 'false',
    allowed_formats: 'jpg,png,webp',
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  return {
    url: 'https://api.cloudinary.com/v1_1/' + config.cloud + '/image/upload',
    fields: {
      ...fields,
      api_key: config.key,
      signature: signFields(fields, config.secret),
    },
  };
}
export async function verifiedUploadedImage(publicId: string) {
  if (!isManagedPublicId(publicId))
    throw new ApiFailure(400, 'Invalid managed asset.');
  const config = cloudinaryConfig();
  const response = await fetch(
    'https://api.cloudinary.com/v1_1/' +
      config.cloud +
      '/resources/image/upload/' +
      encodeURIComponent(publicId),
    {
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(config.key + ':' + config.secret).toString('base64'),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    },
  );
  if (response.status === 404)
    throw new ApiFailure(
      409,
      'The image upload is not complete yet. Please try again.',
    );
  if (!response.ok)
    throw new ApiFailure(
      502,
      'Image verification is temporarily unavailable. Please try again; your upload can be verified without uploading again.',
    );
  const result = await response.json();
  if (
    result.public_id !== publicId ||
    result.resource_type !== 'image' ||
    result.type !== 'upload' ||
    !['jpg', 'png', 'webp'].includes(result.format) ||
    !Number.isSafeInteger(result.width) ||
    result.width < 1 ||
    !Number.isSafeInteger(result.height) ||
    result.height < 1 ||
    !Number.isSafeInteger(result.bytes) ||
    result.bytes < 1 ||
    typeof result.secure_url !== 'string' ||
    !result.secure_url.startsWith(
      'https://res.cloudinary.com/' + config.cloud + '/image/upload/',
    )
  ) {
    throw new ApiFailure(502, 'The uploaded image could not be verified.');
  }
  return {
    url: result.secure_url as string,
    width: result.width as number,
    height: result.height as number,
    bytes: result.bytes as number,
  };
}
async function cloudinaryRequest(
  action: 'upload' | 'destroy',
  fields: Record<string, string>,
  file?: File,
) {
  const config = cloudinaryConfig();
  const params = {
    ...fields,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const signature = createHash('sha256')
    .update(
      Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&') + config.secret,
    )
    .digest('hex');
  const body = new FormData();
  Object.entries(params).forEach(([key, value]) => body.set(key, value));
  body.set('api_key', config.key);
  body.set('signature', signature);
  if (file) body.set('file', file);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloud}/image/${action}`,
    { method: 'POST', body, signal: AbortSignal.timeout(45000) },
  );
  if (!response.ok)
    throw new ApiFailure(
      502,
      'Cloudinary could not complete the request. Please retry.',
    );
  return response.json();
}
export async function validateImage(file: File) {
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    throw new ApiFailure(400, 'Choose an image up to 4 MB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (value, index) => bytes[index] === value,
  );
  const webp =
    Buffer.from(bytes.slice(0, 4)).toString() === 'RIFF' &&
    Buffer.from(bytes.slice(8, 12)).toString() === 'WEBP';
  if (!(
    (jpeg && file.type === 'image/jpeg') ||
    (png && file.type === 'image/png') ||
    (webp && file.type === 'image/webp')
  ))
    throw new ApiFailure(400, 'Choose a JPEG, PNG or WebP image.');
}
export async function uploadImage(file: File, publicId: string) {
  if (!isManagedPublicId(publicId))
    throw new ApiFailure(400, 'Invalid managed asset.');
  await validateImage(file);
  const result = await cloudinaryRequest(
    'upload',
    {
      public_id: publicId,
      overwrite: 'false',
      allowed_formats: 'jpg,png,webp',
    },
    file,
  );
  if (
    result.public_id !== publicId ||
    result.resource_type !== 'image' ||
    !['jpg', 'png', 'webp'].includes(result.format) ||
    !Number.isInteger(result.width) ||
    result.width < 1 ||
    !Number.isInteger(result.height) ||
    result.height < 1 ||
    typeof result.secure_url !== 'string' ||
    !result.secure_url.startsWith(
      `https://res.cloudinary.com/${cloudinaryConfig().cloud}/image/upload/`,
    )
  )
    throw new ApiFailure(
      502,
      'Image verification failed. Remove the pending upload and retry.',
    );
  return {
    url: result.secure_url as string,
    width: result.width as number,
    height: result.height as number,
  };
}
export async function destroyImage(publicId: string) {
  if (!isManagedPublicId(publicId))
    throw new ApiFailure(400, 'Cannot delete an unmanaged image.');
  const result = await cloudinaryRequest('destroy', {
    public_id: publicId,
    invalidate: 'true',
  });
  if (!['ok', 'not found'].includes(result.result))
    throw new ApiFailure(502, 'Image deletion failed. Please retry.');
}
