import { randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import {
  defaultPrices,
  pricingUpdateSchema,
  type Pricing,
} from '../features/pricing/model';
import { ApiFailure } from './enquiries';

export type PricingRecord = Pricing & {
  _id: string;
  updatedAt: Date;
  updatedBy: string;
};
export class PricingService {
  constructor(private collection: Collection<PricingRecord>) {}
  async get(): Promise<Pricing> {
    const record = await this.collection.findOne({ _id: 'services' });
    return record
      ? { prices: record.prices, revision: record.revision }
      : { prices: { ...defaultPrices }, revision: 'initial' };
  }
  async update(input: unknown, adminId: string): Promise<Pricing> {
    const parsed = pricingUpdateSchema.safeParse(input);
    if (!parsed.success)
      throw new ApiFailure(
        400,
        'Enter whole-rupee prices between ₹0 and ₹10,00,000 for every service.',
      );
    const next = { prices: parsed.data.prices, revision: randomUUID() };
    try {
      const result = await this.collection.updateOne(
        { _id: 'services', revision: parsed.data.revision },
        { $set: { ...next, updatedAt: new Date(), updatedBy: adminId } },
        { upsert: parsed.data.revision === 'initial' },
      );
      if (!result.matchedCount && !result.upsertedCount)
        throw new ApiFailure(
          409,
          'Prices changed in another session. Reload prices before saving again.',
        );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 11000
      )
        throw new ApiFailure(
          409,
          'Prices changed in another session. Reload prices before saving again.',
        );
      throw error;
    }
    return next;
  }
}
