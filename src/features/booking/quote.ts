import { z } from 'zod';
import { bookableServices } from '../../data/catalog';
import { eventTypes } from './events';
import { contactSchema } from './contact-validation';

export const quoteCatalogueVersion = 'guided-sample-v3';
// Provisional choices for development, not confirmed studio availability/inclusions.
export const weddingCeremonies = [
  { id: 'wedding', name: 'Wedding ceremony' },
  { id: 'engagement', name: 'Engagement' },
  { id: 'groom-making', name: 'Groom Making' },
  { id: 'groom-haldi', name: 'Groom Haldi' },
  { id: 'bride-making', name: 'Bride Making' },
  { id: 'bride-haldi', name: 'Bride Haldi' },
  { id: 'reception', name: 'Reception' },
  { id: 'vratham', name: 'Vratham' },
  { id: 'sangeet', name: 'Sangeeth' },
  { id: 'mehendi', name: 'Mehendi' },
  { id: 'cocktail', name: 'Cocktail party' },
  { id: 'pre-wedding', name: 'Pre-wedding shoot' },
  { id: 'post-wedding', name: 'Post-wedding shoot' },
] as const;
export function ceremoniesForEvent(event: string) {
  return event === 'Marriage'
    ? weddingCeremonies
    : eventTypes.some((e) => e === event)
      ? [
          {
            id: 'shoot',
            name: event === 'Pre-Wedding' ? 'Pre-wedding shoot' : event,
          },
        ]
      : [];
}
export const ceremonyName = (event: string, id: string) =>
  ceremoniesForEvent(event).find((c) => c.id === id)?.name ?? id;
export const isCoupleShoot = (event: string, id: string) =>
  ['Pre-Wedding', 'Post-Wedding'].includes(event) ||
  id === 'pre-wedding' ||
  id === 'post-wedding';
export function coverageFor(event: string, id: string) {
  const base = [
    'traditional-photo',
    'traditional-video',
    'candid',
    'cinematic',
  ];
  const available = isCoupleShoot(event, id)
    ? ['candid', 'cinematic', 'drone']
    : id === 'vratham'
      ? ['traditional-photo', 'traditional-video']
      : [
            'groom-making',
            'groom-haldi',
            'bride-making',
            'bride-haldi',
            'sangeet',
            'mehendi',
          ].includes(id)
        ? base
        : id === 'cocktail'
          ? [...base, 'drone']
          : event === 'Baby Shoot'
            ? ['candid', 'traditional-photo', 'cinematic']
            : [
                ...base,
                'drone',
                'audience-video',
                ...(event === 'Maternity' ? ['outdoor'] : []),
              ];
  if (!ceremoniesForEvent(event).some((c) => c.id === id)) return [];
  return bookableServices.filter((s) => available.includes(s.id));
}
export function ceremonyExtrasFor(event: string, id: string) {
  return !isCoupleShoot(event, id) &&
    ['Marriage', 'Engagement', 'Birthday', 'Corporate'].includes(event)
    ? bookableServices.filter((s) =>
        ['streaming', 'led-wall', 'crane'].includes(s.id),
      )
    : [];
}
const albumService = bookableServices.find((s) => s.id === 'album')!;
export const albumPrice = (size: QuoteDraft['albumSize']) =>
  size === '14x40' ? 14000 : albumService.price;
export const ceremonySchema = z
  .object({
    id: z.string().max(40),
    date: z.string().max(10),
    dateUndecided: z.boolean(),
    location: z.string().trim().max(300),
    days: z.number().int().min(1).max(2),
    serviceIds: z.array(z.string().max(50)).max(12),
    quantities: z
      .record(z.string().max(50), z.number().int().min(1).max(5))
      .default({}),
  })
  .strict();
export const quoteInputSchema = z
  .object({
    quoteVersion: z.literal(2),
    eventType: z.enum(eventTypes),
    ceremonies: z.array(ceremonySchema).min(1).max(weddingCeremonies.length),
    albumQuantity: z.number().int().min(0).max(5),
    albumSize: z.enum(['12x36', '14x40']).default('12x36'),
    albumDelivery: z
      .enum(['discuss', 'one-month', 'three-month'])
      .default('discuss'),
    name: z.string().trim().min(1).max(100),
    mobile: z.string().regex(/^\d{10}$/),
    notes: z.string().trim().max(1000),
  })
  .strict();
export type Ceremony = z.infer<typeof ceremonySchema>;
type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteDraft = Omit<QuoteInput, 'eventType'> & { eventType: string };
export type QuoteItem = {
  id: string;
  serviceId: string;
  name: string;
  groupId: string;
  groupName: string;
  price: number;
  quantity: number;
  unit: string;
};
export const canonicalQuantities = (quantities: Ceremony['quantities']) =>
  Object.fromEntries(
    Object.entries(quantities)
      .filter(([, value]) => value !== 1)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
export const newCeremony = (id: string): Ceremony => ({
  id,
  date: '',
  dateUndecided: true,
  location: '',
  days: 1,
  serviceIds: [],
  quantities: {},
});
export function indiaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join('-');
}
export function dateError(
  date: string,
  undecided: boolean,
  today = indiaToday(),
) {
  if (undecided) return date ? 'Clear the date when it is not decided.' : '';
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    return 'Choose a valid date or select Date not decided.';
  return date < today ? 'Choose today or a future date.' : '';
}
export function validateQuote(draft: QuoteDraft, today = indiaToday()) {
  const errors: Record<string, string> = {};
  if (!eventTypes.some((e) => e === draft.eventType))
    errors.eventType = 'Choose an event.';
  const allowed = ceremoniesForEvent(draft.eventType);
  if (
    !draft.ceremonies.length ||
    draft.ceremonies.length > allowed.length ||
    new Set(draft.ceremonies.map((c) => c.id)).size !==
      draft.ceremonies.length ||
    draft.ceremonies.some((c) => !allowed.some((a) => a.id === c.id))
  )
    errors.ceremonies = 'Choose valid, distinct ceremonies for your event.';
  for (const c of draft.ceremonies) {
    const label = ceremonyName(draft.eventType, c.id);
    const message = dateError(c.date, c.dateUndecided, today);
    if (message) errors[c.id + '-date'] = label + ': ' + message;
    if (c.location.trim().length > 300)
      errors[c.id + '-location'] = label + ': use 300 characters or fewer.';
    if (
      !Number.isInteger(c.days) ||
      c.days < 1 ||
      c.days > (isCoupleShoot(draft.eventType, c.id) ? 2 : 1)
    )
      errors[c.id + '-days'] = label + ': choose a valid duration.';
    if (
      !coverageFor(draft.eventType, c.id).some((s) =>
        c.serviceIds.includes(s.id),
      )
    )
      errors[c.id + '-coverage'] =
        label + ': select at least one coverage service.';
    const eligible = [
      ...coverageFor(draft.eventType, c.id),
      ...ceremonyExtrasFor(draft.eventType, c.id),
    ];
    if (
      Object.entries(c.quantities).some(
        ([id, q]) =>
          !c.serviceIds.includes(id) || !Number.isInteger(q) || q < 1 || q > 5,
      )
    )
      errors[c.id + '-quantities'] =
        'Choose one to five units for each selected service.';
    if (
      new Set(c.serviceIds).size !== c.serviceIds.length ||
      c.serviceIds.some((id) => !eligible.some((s) => s.id === id))
    )
      errors[c.id + '-selection'] =
        label + ': select each eligible service only once.';
  }
  if (
    !Number.isInteger(draft.albumQuantity) ||
    draft.albumQuantity < 0 ||
    draft.albumQuantity > 5
  )
    errors.album = 'Choose zero to five albums.';
  const result = contactSchema.safeParse(draft);
  if (!result.success)
    for (const issue of result.error.issues)
      errors[String(issue.path[0])] = issue.message;
  if (draft.notes.trim().length > 1000)
    errors.notes = 'Use 1,000 characters or fewer for notes.';
  return errors;
}
export function quoteItems(draft: QuoteDraft): QuoteItem[] {
  const items: QuoteItem[] = draft.ceremonies.flatMap((c) =>
    [
      ...coverageFor(draft.eventType, c.id),
      ...ceremonyExtrasFor(draft.eventType, c.id),
    ]
      .filter((s) => c.serviceIds.includes(s.id))
      .map((s) => ({
        id: `${c.id}:${s.id}`,
        serviceId: s.id,
        name: s.name,
        groupId: c.id,
        groupName: ceremonyName(draft.eventType, c.id),
        price: s.price,
        quantity:
          (isCoupleShoot(draft.eventType, c.id) ? c.days : 1) *
          (c.quantities[s.id] ?? 1),
        unit: isCoupleShoot(draft.eventType, c.id) ? 'per day' : 'per ceremony',
      })),
  );
  if (draft.albumQuantity > 0)
    items.push({
      id: 'extras:album',
      serviceId: 'album',
      name: `${albumService.name} · ${draft.albumSize}`,
      groupId: 'extras',
      groupName: 'Albums',
      price: albumPrice(draft.albumSize),
      quantity: draft.albumQuantity,
      unit: 'per album',
    });
  return items;
}
export const quoteTotal = (draft: QuoteDraft) =>
  quoteItems(draft).reduce((sum, i) => sum + i.price * i.quantity, 0);
export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
