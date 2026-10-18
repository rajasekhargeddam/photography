import { Collection, MongoServerError } from 'mongodb';
import type { Enquiry, EnquiryRepository } from './enquiries';

export class MongoEnquiries implements EnquiryRepository {
  constructor(private collection: Collection<Enquiry>) {}
  async initialize() {
    await this.collection.createIndex({ createdAt: -1, _id: -1 });
    await this.collection.createIndex({ status: 1, createdAt: -1, _id: -1 });
  }
  find(id: string) {
    return this.collection.findOne({ _id: id });
  }
  async insert(value: Enquiry) {
    try {
      await this.collection.insertOne(value);
      return true;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000)
        return false;
      throw error;
    }
  }
  async replace(value: Enquiry, previousRevision: string) {
    const result = await this.collection.replaceOne(
      { _id: value._id, revision: previousRevision, status: 'ATTEMPTED' },
      value,
    );
    return result.matchedCount === 1;
  }
  list(limit: number, offset: number, status?: Enquiry['status']) {
    return this.collection
      .find(status ? { status } : {})
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }
}
