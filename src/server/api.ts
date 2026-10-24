import { z } from 'zod';
import { AuthService, SESSION_COOKIE, SESSION_SECONDS } from './auth';
import type { AuthRepository } from './auth';
import {
  ApiFailure,
  EnquiryService,
  hash,
  publicEnquiry,
  type EnquiryRepository,
} from './enquiries';
import { checkOrigin, enquiryToken, guarded, json, readJson } from './http';
import type { ContentService } from './content';
import type { ContentKind } from '../features/content/model';
import type { CallbackService } from './callbacks';
import { callbackInput } from '../features/contact/model';
import type { PricingService } from './pricing';
import type { QuoteReads } from './quote-reads';

type Services = {
  quoteReads?: QuoteReads;
  auth: AuthService;
  authRepository: AuthRepository;
  repository: EnquiryRepository;
  service: EnquiryService;
  content?: ContentService;
  callbacks?: CallbackService;
  pricing?: Pick<PricingService, 'get' | 'update'>;
};
function sessionToken(request: Request) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
}
function sessionCookie(token: string, maxAge: number) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export function createApi(getServices: () => Promise<Services>) {
  return (request: Request) =>
    guarded(async () => {
      checkOrigin(request);
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      const contentPath =
        /^\/api\/(admin\/)?content\/(gallery|hero|testimonials|videos)(?:\/([\w-]+))?$/.exec(
          path,
        );
      if (path === '/api/health' && method === 'GET') {
        await getServices();
        return json({ status: 'ok' });
      }
      const known =
        path === '/api/pricing' ||
        path === '/api/admin/pricing' ||
        !!contentPath ||
        path === '/api/callbacks' ||
        path === '/api/admin/callbacks' ||
        path === '/api/auth/login' ||
        path === '/api/auth/logout' ||
        path === '/api/admin/enquiries' ||
        /^\/api\/admin\/enquiries\/[\w-]+\/read$/.test(path) ||
        /^\/api\/(admin\/)?enquiries\/[\w-]+(\/confirm)?$/.test(path);
      if (!known) throw new ApiFailure(404, 'Endpoint not found.');
      // Reject unauthenticated requests before accessing the database.
      const token = sessionToken(request);
      if (
        path.startsWith('/api/admin/') &&
        (!token || !/^[a-f0-9]{64}$/.test(token))
      )
        throw new ApiFailure(401, 'Admin sign-in required.');
      if (path === '/api/auth/login' && method === 'POST') {
        const input = await readJson(request);
        const { auth } = await getServices();
        const fresh = await auth.login(input);
        await auth.logout(token);
        return json({ success: true }, 200, {
          'Set-Cookie': sessionCookie(fresh, SESSION_SECONDS),
        });
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        if (token) await (await getServices()).auth.logout(token);
        return json({ success: true }, 200, {
          'Set-Cookie': sessionCookie('', 0),
        });
      }
      if (path === '/api/callbacks') {
        if (method !== 'POST') throw new ApiFailure(405, 'Method not allowed.');
        const input = callbackInput.safeParse(await readJson(request));
        if (!input.success)
          throw new ApiFailure(
            400,
            input.error.issues[0]?.message ?? 'Check your details.',
          );
        const { callbacks, authRepository } = await getServices();
        if (!callbacks)
          throw new ApiFailure(503, 'Callback requests unavailable.');
        if (
          !(await authRepository.consume('callback:global', 100, 600)) ||
          !(await authRepository.consume(
            `callback:${hash(input.data.mobile)}`,
            5,
            600,
          ))
        )
          throw new ApiFailure(
            429,
            'Please wait before sending another callback request.',
          );
        await callbacks.save(input.data);
        return json({ success: true }, 200);
      }
      if (path.startsWith('/api/admin/')) {
        const { auth, repository, authRepository } = await getServices();
        const admin = await auth.current(token);
        if (!admin) throw new ApiFailure(401, 'Admin sign-in required.');
        const readMatch = /^\/api\/admin\/enquiries\/([\w-]+)\/read$/.exec(
          path,
        );
        if (readMatch) {
          if (method !== 'POST')
            throw new ApiFailure(405, 'Method not allowed.');
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
          if (!input.success)
            throw new ApiFailure(400, 'Invalid read receipt.');
          const record = await repository.find(readMatch[1]);
          if (!record) throw new ApiFailure(404, 'Enquiry not found.');
          if (
            record.revision !== input.data.revision ||
            record.status !== input.data.status
          )
            throw new ApiFailure(409, 'Quote changed. Refresh its details.');
          const { quoteReads } = await getServices();
          if (!quoteReads)
            throw new ApiFailure(503, 'Read status unavailable.');
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
            return json(
              await pricing.update(await readJson(request), admin.id),
            );
          throw new ApiFailure(405, 'Method not allowed.');
        }
        if (contentPath) {
          if (!(await authRepository.consume(`content:${admin.id}`, 60, 60)))
            throw new ApiFailure(
              429,
              'Please wait a minute before trying again.',
            );
          const { content } = await getServices();
          if (!content)
            throw new ApiFailure(503, 'Content service unavailable.');
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
          if (!callbacks)
            throw new ApiFailure(503, 'Callback requests unavailable.');
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
      if (path === '/api/pricing') {
        if (method !== 'GET') throw new ApiFailure(405, 'Method not allowed.');
        const { pricing } = await getServices();
        if (!pricing) throw new ApiFailure(503, 'Pricing unavailable.');
        return json(await pricing.get());
      }
      if (contentPath) {
        const { content } = await getServices();
        if (!content) throw new ApiFailure(503, 'Content service unavailable.');
        return content.handle(
          request,
          contentPath[2] as ContentKind,
          contentPath[3],
          false,
        );
      }
      const match = /^\/api\/enquiries\/([\w-]+)(\/confirm)?$/.exec(path);
      if (
        match &&
        ((!match[2] && method === 'PUT') || (match[2] && method === 'POST'))
      ) {
        const owner = enquiryToken(request, match[1]);
        const body = await readJson(request);
        const { service, authRepository } = await getServices();
        if (
          !(await authRepository.consume('enquiry:global', 600, 60)) ||
          !(await authRepository.consume(`enquiry:${hash(owner)}`, 60, 60))
        )
          throw new ApiFailure(
            429,
            'Too many requests. Please wait a minute and try again.',
          );
        if (!match[2])
          return json(publicEnquiry(await service.save(match[1], owner, body)));
        const parsed = z
          .object({ revision: z.uuid() })
          .strict()
          .safeParse(body);
        if (!parsed.success)
          throw new ApiFailure(400, 'Review your enquiry before confirming.');
        return json(
          publicEnquiry(
            await service.confirm(match[1], owner, parsed.data.revision),
          ),
        );
      }
      throw new ApiFailure(405, 'Method not allowed.');
    });
}
