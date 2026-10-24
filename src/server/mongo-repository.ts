import { Collection, MongoServerError, type Document } from 'mongodb';
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
  list(
    limit: number,
    offset: number,
    status?: Enquiry['status'],
    filters?: { search?: string; unread?: boolean },
  ) {
    if (filters?.search || filters?.unread)
      return this.collection
        .aggregate<Enquiry>(
          enquirySearchPipeline(limit, offset, status, filters),
        )
        .toArray();
    return this.collection
      .find(status ? { status } : {})
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }
}

export function enquirySearchPipeline(
  limit: number,
  offset: number,
  status?: Enquiry['status'],
  filters: { search?: string; unread?: boolean } = {},
): Document[] {
  const match: Document = status ? { status } : {};
  if (filters.search) {
    const literal = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.$or = [
      { 'details.name': { $regex: literal, $options: 'i' } },
      { 'details.mobile': { $regex: literal } },
    ];
  }
  const pipeline: Document[] = [{ $match: match }];
  if (filters.unread)
    pipeline.push(
      {
        $lookup: {
          from: 'quoteReads',
          localField: '_id',
          foreignField: '_id',
          as: 'readReceipts',
        },
      },
      {
        $match: {
          $expr: {
            $not: [
              {
                $anyElementTrue: [
                  {
                    $map: {
                      input: '$readReceipts',
                      as: 'receipt',
                      in: {
                        $and: [
                          { $eq: ['$$receipt.revision', '$revision'] },
                          { $eq: ['$$receipt.status', '$status'] },
                        ],
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
      { $unset: 'readReceipts' },
    );
  pipeline.push(
    { $sort: { createdAt: -1, _id: -1 } },
    { $skip: offset },
    { $limit: limit },
  );
  return pipeline;
}
