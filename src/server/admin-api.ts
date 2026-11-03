import { z } from 'zod';
import { ApiFailure, publicEnquiry } from './enquiries';
import { json, readJson } from './http';
import type { ContentKind } from '../features/content/model';
import type { Services } from './api-services';

export async function adminApi(
  request: Request,
  getServices: () => Promise<Services>,
  token: string | undefined,
  contentPath: RegExpExecArray | null,
) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const { auth, repository, authRepository } = await getServices();
  const admin = await auth.current(token);
  if (!admin) throw new ApiFailure(401, 'Admin sign-in required.');
  const readMatch = /^\/api\/admin\/enquiries\/([\w-]+)\/read$/.exec(path);
  if (readMatch) {
    if (method !== 'POST') throw new ApiFailure(405, 'Method not allowed.');
    if (!z.uuid().safeParse(readMatch[1]).success)
      throw new ApiFailure(400, 'Invalid enquiry reference.');
    if (!(await authRepository.consume(`read:${admin.id}`, 120, 60)))
      throw new ApiFailure(429, 'Please wait before trying again.');
    const input = z
      .object({
        revision: z.uuid(),
        status: z.enum(['ATTEMPTED', 'CONFIRMED']),
      })
      .strict()
      .safeParse(await readJson(request));
    if (!input.success) throw new ApiFailure(400, 'Invalid read receipt.');
    const record = await repository.find(readMatch[1]);
    if (!record) throw new ApiFailure(404, 'Enquiry not found.');
    if (
      record.revision !== input.data.revision ||
      record.status !== input.data.status
    )
      throw new ApiFailure(409, 'Quote changed. Refresh its details.');
    const { quoteReads } = await getServices();
    if (!quoteReads) throw new ApiFailure(503, 'Read status unavailable.');
    await quoteReads.mark(record);
    return json({ success: true });
  }
  if (path === '/api/admin/pricing') {
    if (!(await authRepository.consume(`pricing:${admin.id}`, 60, 60)))
      throw new ApiFailure(429, 'Please wait before trying again.');
    const { pricing } = await getServices();
    if (!pricing) throw new ApiFailure(503, 'Pricing unavailable.');
    if (method === 'GET') return json(await pricing.get());
    if (method === 'PUT')
      return json(await pricing.update(await readJson(request), admin.id));
    throw new ApiFailure(405, 'Method not allowed.');
  }
  if (contentPath) {
    if (!(await authRepository.consume(`content:${admin.id}`, 60, 60)))
      throw new ApiFailure(429, 'Please wait a minute before trying again.');
    const { content } = await getServices();
    if (!content) throw new ApiFailure(503, 'Content service unavailable.');
    return content.handle(
      request,
      contentPath[2] as ContentKind,
      contentPath[3],
      true,
    );
  }
  if (method !== 'GET') throw new ApiFailure(405, 'Method not allowed.');
  if (!(await authRepository.consume(`admin:${admin.id}`, 120, 60)))
    throw new ApiFailure(429, 'Please wait before refreshing again.');
  if (path === '/api/admin/callbacks') {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .safeParse(url.searchParams.get('offset') ?? 0);
    if (!offset.success) throw new ApiFailure(400, 'Invalid pagination.');
    const { callbacks } = await getServices();
    if (!callbacks) throw new ApiFailure(503, 'Callback requests unavailable.');
    return json({ items: await callbacks.list(offset.data) });
  }
  if (path === '/api/admin/enquiries') {
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(30),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
        status: z.enum(['ATTEMPTED', 'CONFIRMED']).optional(),
        search: z.string().trim().max(100).optional(),
        unread: z.literal('1').optional(),
      })
      .strict()
      .safeParse(Object.fromEntries(url.searchParams));
    if (!query.success) throw new ApiFailure(400, 'Invalid pagination.');
    const records = await repository.list(
      query.data.limit,
      query.data.offset,
      query.data.status,
      { search: query.data.search, unread: query.data.unread === '1' },
    );
    const { quoteReads } = await getServices();
    const unread = quoteReads
      ? await quoteReads.unread(records)
      : records.map(() => true);
    return json({
      enquiries: records.map((record, i) => ({
        ...publicEnquiry(record),
        unread: unread[i],
      })),
    });
  }
  const id = path.slice('/api/admin/enquiries/'.length);
  if (!z.uuid().safeParse(id).success)
    throw new ApiFailure(400, 'Invalid enquiry reference.');
  const record = await repository.find(id);
  if (!record) throw new ApiFailure(404, 'Enquiry not found.');
  return json(publicEnquiry(record));
}
