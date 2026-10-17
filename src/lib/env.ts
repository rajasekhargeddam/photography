import { z } from 'zod';

// Explicit references are required for Next.js to inline public variables.
export const env = z
  .object({
    siteUrl: z.url(),
    apiBaseUrl: z.literal('/api'),
  })
  .parse({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    apiBaseUrl: '/api',
  });
