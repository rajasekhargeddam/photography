import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(100, 'Use 100 characters or fewer.'),
  mobile: z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number.'),
});
