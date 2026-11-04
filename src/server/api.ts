import { z } from 'zod';
import { isManagementPath, managementEnabled } from '../config/app-variant';
import { callbackInput } from '../features/contact/model';
import type { ContentKind } from '../features/content/model';
import { adminApi } from './admin-api';
import type { Services } from './api-services';
import { SESSION_COOKIE, SESSION_SECONDS } from './auth';
import { ApiFailure, hash, publicEnquiry } from './enquiries';
import { checkOrigin, enquiryToken, guarded, json, readJson } from './http';

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
      if (!managementEnabled() && isManagementPath(path))
        throw new ApiFailure(404, 'Endpoint not found.');
      const contentPath =
        /^\/api\/(admin\/)?content\/(gallery|hero|testimonials|videos)(?:\/([\w-]+))?$/.exec(
          path,
        );
      if (path === '/api/health' && method === 'GET') {
        await getServices();
        return json({ status: 'ok' });
      }
      if (path === '/api/home') {
        if (method !== 'GET') throw new ApiFailure(405, 'Method not allowed.');
        if (url.search) throw new ApiFailure(400, 'Invalid home query.');
        const { content } = await getServices();
        if (!content) throw new ApiFailure(503, 'Content service unavailable.');
        const sections = [
          ['hero', 5],
          ['gallery', 8],
          ['testimonials', 3],
          ['videos', 1],
        ] as const;
        const entries = await Promise.all(
          sections.map(async ([kind, limit]) => {
            const response = await content.handle(
              new Request(
                new URL('/api/content/' + kind + '?limit=' + limit, url),
              ),
              kind,
              undefined,
              false,
            );
            return [kind, await response.json()];
          }),
        );
        return json(Object.fromEntries(entries));
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
        return json({ success: true, requestId: input.data.requestId }, 200);
      }
      if (path.startsWith('/api/admin/'))
        return adminApi(request, getServices, token, contentPath);
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
