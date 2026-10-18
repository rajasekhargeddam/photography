import { z } from 'zod';
import { ceremonySchema } from '../booking/quote';

export const enquirySchema = z.object({
  id: z.uuid(),
  revision: z.uuid(),
  status: z.enum(['ATTEMPTED', 'CONFIRMED']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime().nullable(),
  details: z.object({
    bookingType: z.enum(['PACKAGE', 'CUSTOM']),
    packageId: z.string(),
    catalogueVersion: z.string().optional(),
    quoteVersion: z.literal(2).optional(),
    ceremonies: z.array(ceremonySchema).optional(),
    albumQuantity: z.number().optional(),
    albumSize: z.string().optional(),
    albumDelivery: z.string().optional(),
    notes: z.string().optional(),
    pricingStatus: z.string().optional(),
    serviceIds: z.array(z.string()),
    eventType: z.string(),
    eventDate: z.string(),
    name: z.string(),
    mobile: z.string().regex(/^\d{10}$/),
    location: z.string(),
    total: z.number(),
    currency: z.literal('INR'),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
        unit: z.string().optional(),
        groupId: z.string().optional(),
        groupName: z.string().optional(),
        serviceId: z.string().optional(),
      }),
    ),
  }),
});
export type Enquiry = z.infer<typeof enquirySchema>;
const listSchema = z.object({ enquiries: z.array(enquirySchema) });

async function request(path: string, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`/api/admin/${path}`, { signal, cache: 'no-store' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Unable to reach the booking server. Please try again.');
  }
  if (!response.ok) {
    if (response.status === 404)
      throw new Error('This quote request could not be found.');
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined')
        window.location.replace('/admin/login');
      throw new Error('Your session has ended. Please sign in again.');
    }
    if (response.status === 429)
      throw new Error('Please wait a minute before refreshing again.');
    throw new Error('The booking server is unavailable. Please try again.');
  }
  return response.json();
}
export async function fetchEnquiries(offset: number, signal: AbortSignal) {
  const result = listSchema.safeParse(
    await request(`enquiries?limit=30&offset=${offset}`, signal),
  );
  if (!result.success)
    throw new Error(
      'The quote request list could not be read. Please try again.',
    );
  return result.data.enquiries;
}
export async function fetchEnquiry(id: string, signal: AbortSignal) {
  if (!z.uuid().safeParse(id).success)
    throw new Error('This quote request link is invalid.');
  const result = enquirySchema.safeParse(
    await request(`enquiries/${encodeURIComponent(id)}`, signal),
  );
  if (!result.success)
    throw new Error(
      'The quote request details could not be read. Please try again.',
    );
  return result.data;
}
function indiaDay(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join('-');
}
export const eventDate = (date: string) =>
  !date
    ? 'Date not decided'
    : new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(`${date}T12:00:00+05:30`));
export const receivedAt = (date: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
export const timeOfDay = (date: string) =>
  new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
export const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
export function groupEnquiries(records: Enquiry[], now = new Date()) {
  return groupByReceivedDay(records, (record) => record.id, now).map(
    ({ records, ...group }) => ({ ...group, enquiries: records }),
  );
}
export function groupByReceivedDay<T extends { createdAt: string }>(
  records: T[],
  identify: (record: T) => string,
  now = new Date(),
) {
  const today = indiaDay(now);
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const unique = [
    ...new Map(records.map((record) => [identify(record), record])).values(),
  ];
  unique.sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      identify(b).localeCompare(identify(a)),
  );
  const groups = new Map<
    string,
    { key: string; label: string; records: T[] }
  >();
  for (const record of unique) {
    const key = indiaDay(new Date(record.createdAt));
    if (!groups.has(key))
      groups.set(key, {
        key,
        label:
          key === today
            ? 'Today'
            : key === yesterdayKey
              ? 'Yesterday'
              : eventDate(key),
        records: [],
      });
    groups.get(key)!.records.push(record);
  }
  return [...groups.values()];
}
