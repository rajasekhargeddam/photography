import type { Collection } from 'mongodb';
import { callbackInput, type CallbackRequest } from '../features/contact/model';
import { ApiFailure } from './enquiries';

export class CallbackService {
  constructor(private readonly records: Collection<CallbackRequest>) {}
  async initialize() {
    await this.records.createIndex({ createdAt: -1, _id: 1 });
  }
  async save(input: unknown) {
    const parsed = callbackInput.safeParse(input);
    if (!parsed.success)
      throw new ApiFailure(
        400,
        parsed.error.issues[0]?.message ?? 'Check your contact details.',
      );
    const { requestId, ...details } = parsed.data;
    // Atomic insert-only upsert makes retries safe, even after a lost response.
    await this.records.updateOne(
      { _id: requestId },
      {
        $setOnInsert: {
          _id: requestId,
          ...details,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  }
  async list(offset = 0) {
    return this.records
      .find({})
      .sort({ createdAt: -1, _id: 1 })
      .skip(offset)
      .limit(30)
      .toArray();
  }
}
