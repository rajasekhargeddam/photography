import { z } from 'zod';
import { categories } from '../content/model';
import { contactSchema } from '../booking/contact-validation';
import { indiaToday } from '../booking/quote';

export const callbackInput = contactSchema
  .extend({
    requestId: z.uuid(),
    eventType: z.enum(categories),
    eventDate: z.string().refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        value >= indiaToday()
      );
    }, 'Choose today or a valid future event date.'),
    notes: z
      .string()
      .trim()
      .max(1000, 'Use 1,000 characters or fewer.')
      .default(''),
  })
  .strict();
export type CallbackInput = z.infer<typeof callbackInput>;
export type CallbackRequest = Omit<CallbackInput, 'requestId'> & {
  _id: string;
  createdAt: string;
};
