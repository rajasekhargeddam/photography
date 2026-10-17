import { z } from 'zod';
import { ApiFailure } from './enquiries';

export function json(value: unknown, status = 200, headers?: HeadersInit) {
  const result = new Headers(headers);
  result.set('Cache-Control', 'private, no-store');
  result.set('X-Content-Type-Options', 'nosniff');
  return Response.json(value, { status, headers: result });
}
export async function guarded(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (error) {
    return json(
      {
        message:
          error instanceof ApiFailure
            ? error.message
            : 'The service is unavailable. Please retry.',
      },
      error instanceof ApiFailure ? error.status : 503,
    );
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN ?? new URL(request.url).origin;
  if (
    (origin && origin !== expected) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new ApiFailure(403, 'Origin not allowed.');
  if (request.method !== 'GET' && !origin)
    throw new ApiFailure(403, 'Origin required.');
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiFailure(415, 'JSON content required.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiFailure(400, 'Request body required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new ApiFailure(413, 'Request is too large.');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ApiFailure(400, 'Invalid JSON.');
  }
}
export function enquiryToken(request: Request, id: string) {
  if (!z.uuid().safeParse(id).success)
    throw new ApiFailure(400, 'Invalid enquiry reference.');
  const bearer = request.headers.get('authorization') ?? '';
  if (!/^Bearer [a-f0-9]{64}$/.test(bearer))
    throw new ApiFailure(
      401,
      'Your enquiry session is missing. Return to booking.',
    );
  return bearer.slice(7);
}
