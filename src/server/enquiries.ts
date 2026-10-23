import { createHash, randomUUID } from 'node:crypto';
import type { Pricing, ServicePrices } from '../features/pricing/model';
import {
  quoteInputSchema,
  quoteItems,
  validateQuote,
  quoteCatalogueVersion,
  dateError,
  canonicalQuantities,
  type Ceremony,
  type QuoteItem,
} from '../features/booking/quote';
export class ApiFailure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function snapshot(
  input: unknown,
  prices: ServicePrices = {},
  catalogueVersion = quoteCatalogueVersion,
) {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success)
    throw new ApiFailure(
      400,
      'Check your quote selections and contact details.',
    );
  const data = parsed.data;
  const errors = validateQuote(data);
  if (Object.keys(errors).length)
    throw new ApiFailure(400, Object.values(errors)[0]);
  const ceremonies = [...data.ceremonies]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => ({
      ...c,
      serviceIds: [...c.serviceIds].sort(),
      quantities: canonicalQuantities(c.quantities),
    }));
  const items = quoteItems({ ...data, ceremonies }, prices);
  return {
    ...data,
    ceremonies,
    bookingType: 'CUSTOM' as const,
    packageId: '',
    catalogueVersion,
    pricingStatus: 'DEVELOPMENT_SAMPLE',
    serviceIds: [...new Set(ceremonies.flatMap((c) => c.serviceIds))].sort(),
    eventDate:
      ceremonies
        .map((c) => c.date)
        .filter(Boolean)
        .sort()[0] ?? '',
    location: ceremonies
      .map((c) => c.location)
      .filter(Boolean)
      .join(' / '),
    items,
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    currency: 'INR' as const,
  };
}
// Existing package and single-event custom records remain readable without repricing.
type Snapshot = {
  bookingType: 'PACKAGE' | 'CUSTOM';
  packageId: string;
  serviceIds: string[];
  eventType: string;
  eventDate: string;
  location: string;
  name: string;
  mobile: string;
  currency: 'INR';
  total: number;
  items: ({
    id: string;
    name: string;
    price: number;
    quantity: number;
  } & Partial<
    Pick<QuoteItem, 'unit' | 'serviceId' | 'groupId' | 'groupName'>
  >)[];
  catalogueVersion?: string;
  pricingStatus?: string;
  quoteVersion?: 2;
  ceremonies?: Ceremony[];
  albumQuantity?: number;
  albumSize?: '12x36' | '14x40';
  albumDelivery?: 'discuss' | 'one-month' | 'three-month';
  notes?: string;
};
export type Enquiry = {
  _id: string;
  tokenHash: string;
  revision: string;
  status: 'ATTEMPTED' | 'CONFIRMED';
  details: Snapshot;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
};
export interface EnquiryRepository {
  find(id: string): Promise<Enquiry | null>;
  insert(value: Enquiry): Promise<boolean>;
  replace(value: Enquiry, previousRevision: string): Promise<boolean>;
  list(
    limit: number,
    offset: number,
    status?: Enquiry['status'],
  ): Promise<Enquiry[]>;
}
export const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export function publicEnquiry(value: Enquiry) {
  const { tokenHash: _secret, _id, ...rest } = value;
  void _secret;
  return { id: _id, ...rest };
}
export class EnquiryService {
  constructor(
    private repository: EnquiryRepository,
    private loadPricing?: () => Promise<Pricing>,
  ) {}
  async owned(id: string, token: string) {
    const record = await this.repository.find(id);
    if (!record || record.tokenHash !== hash(token))
      throw new ApiFailure(404, 'Enquiry not found.');
    return record;
  }
  async save(id: string, token: string, input: unknown) {
    // Retried saves keep the price snapshot the customer already reviewed.
    const previous = await this.repository.find(id);
    if (previous) {
      await this.owned(id, token);
      if (previous.details.quoteVersion === 2) {
        const recordedPrices = Object.fromEntries(
          previous.details.items.map((item) => [
            item.serviceId === 'album' && previous.details.albumSize === '14x40'
              ? 'album-large'
              : (item.serviceId ?? item.id),
            item.price,
          ]),
        );
        const retry = snapshot(
          input,
          recordedPrices,
          previous.details.catalogueVersion,
        );
        if (JSON.stringify(retry) === JSON.stringify(previous.details))
          return previous;
      }
    }
    const pricing = await this.loadPricing?.();
    const details = snapshot(input, pricing?.prices, pricing?.revision);
    const now = new Date();
    const record: Enquiry = {
      _id: id,
      tokenHash: hash(token),
      revision: randomUUID(),
      status: 'ATTEMPTED',
      details,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
    };
    if (await this.repository.insert(record)) return record;
    const existing = await this.owned(id, token);
    if (existing.details.bookingType === 'PACKAGE')
      throw new ApiFailure(
        409,
        'This historical package request is read-only. Start a custom enquiry.',
      );
    if (JSON.stringify(existing.details) === JSON.stringify(details))
      return existing;
    if (existing.status === 'CONFIRMED')
      throw new ApiFailure(
        409,
        'This request is already confirmed. Start a new enquiry to make changes.',
      );
    const updated = {
      ...existing,
      details,
      revision: randomUUID(),
      updatedAt: now,
    };
    if (!(await this.repository.replace(updated, existing.revision)))
      throw new ApiFailure(409, 'Your enquiry changed. Please try again.');
    return updated;
  }
  async confirm(id: string, token: string, revision: string) {
    const existing = await this.owned(id, token);
    // A repeated confirmation must return the original success, even after its event date.
    if (existing.status === 'CONFIRMED' && existing.revision === revision)
      return existing;
    if (existing.revision !== revision)
      throw new ApiFailure(
        409,
        'Your details changed. Review your enquiry again.',
      );
    if (existing.details.bookingType === 'PACKAGE')
      throw new ApiFailure(
        409,
        'This historical package request is read-only. Start a custom enquiry.',
      );
    if (existing.details.quoteVersion === 2) {
      const d = existing.details;
      snapshot({
        quoteVersion: 2,
        eventType: d.eventType,
        ceremonies: d.ceremonies,
        albumQuantity: d.albumQuantity,
        albumSize: d.albumSize,
        albumDelivery: d.albumDelivery,
        name: d.name,
        mobile: d.mobile,
        notes: d.notes,
      });
    } else {
      const message = dateError(existing.details.eventDate, false);
      if (message) throw new ApiFailure(400, message);
    }
    const now = new Date();
    const updated: Enquiry = {
      ...existing,
      status: 'CONFIRMED',
      confirmedAt: now,
      updatedAt: now,
    };
    if (!(await this.repository.replace(updated, existing.revision))) {
      const latest = await this.owned(id, token);
      if (latest.status === 'CONFIRMED' && latest.revision === revision)
        return latest;
      throw new ApiFailure(
        409,
        'Your enquiry changed. Please review it again.',
      );
    }
    return updated;
  }
}
