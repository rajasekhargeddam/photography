import type { Collection } from 'mongodb';
import type { Enquiry } from './enquiries';

export type QuoteRead = {
  _id: string;
  revision: string;
  status: Enquiry['status'];
};
export class QuoteReads {
  constructor(private records: Collection<QuoteRead>) {}
  async unread(quotes: Enquiry[]) {
    const reads = await this.records
      .find({ _id: { $in: quotes.map((q) => q._id) } })
      .toArray();
    const byId = new Map(reads.map((r) => [r._id, r]));
    return quotes.map((q) => {
      const read = byId.get(q._id);
      return read?.revision !== q.revision || read?.status !== q.status;
    });
  }
  async mark(quote: Enquiry) {
    await this.records.updateOne(
      { _id: quote._id },
      { $set: { revision: quote.revision, status: quote.status } },
      { upsert: true },
    );
  }
}
