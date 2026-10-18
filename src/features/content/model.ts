import { z } from 'zod';

export const categories = [
  'Wedding',
  'Pre-Wedding',
  'Engagement',
  'Makeover',
  'Half Sari',
  'Haldi',
  'Birthday',
  'Others',
] as const;
export const contentKinds = [
  'gallery',
  'hero',
  'testimonials',
  'videos',
] as const;
export type ContentKind = (typeof contentKinds)[number];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const imageInput = z
  .object({
    category: z.enum(categories),
    alt: z.string().trim().min(1).max(250),
  })
  .strict();
export const testimonialInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    text: z.string().trim().min(1).max(3000),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      }, 'Enter a valid review date.'),
  })
  .strict();
export function youtubeId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port)
      return null;
    const host = url.hostname;
    let id: string | undefined | null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'www.youtube-nocookie.com',
      ].includes(host)
    ) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : /^\/(?:shorts|embed|live)\/([^/]+)$/.exec(url.pathname)?.[1];
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export const videoInput = z
  .object({
    title: z.string().trim().min(1).max(150),
    url: z
      .string()
      .max(500)
      .refine(
        (value) => !!youtubeId(value),
        'Enter a valid HTTPS YouTube video link.',
      ),
  })
  .strict();
export type ContentRecord = {
  _id: string;
  kind: ContentKind;
  state: 'ready' | 'pending' | 'deleted';
  createdAt: string;
  sample?: boolean;
  publicId?: string;
  heroSlot?: number;
  url?: string;
  width?: number;
  height?: number;
  bytes?: number;
  uploadExpiresAt?: string;
  category?: (typeof categories)[number];
  alt?: string;
  name?: string;
  text?: string;
  date?: string;
  title?: string;
  videoId?: string;
};
