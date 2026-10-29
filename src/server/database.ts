import 'server-only';
import {
  ContentPublication,
  type PublicationRecord,
} from './content-publication';
import { MongoClient } from 'mongodb';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { MongoAuth } from './mongo-auth';
import { MongoEnquiries } from './mongo-repository';
import { type Enquiry, EnquiryService } from './enquiries';
import { AuthService } from './auth';
import { ContentService } from './content';
import type { ContentRecord } from '../features/content/model';
import { CallbackService } from './callbacks';
import type { CallbackRequest } from '../features/contact/model';
import { PricingService, type PricingRecord } from './pricing';
import { drainTelegram } from './telegram-queue';
import { QuoteReads, type QuoteRead } from './quote-reads';

// Keep the database connection across hot reloads, not application service instances.
const connections = globalThis as typeof globalThis & {
  photographyMongoClient?: Promise<MongoClient>;
};
async function mongoClient() {
  connections.photographyMongoClient ??= (async () => {
    if (!process.env.MONGODB_URI)
      throw new Error('Database configuration is missing.');
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      await client.close();
      throw error;
    }
  })().catch((error) => {
    connections.photographyMongoClient = undefined;
    throw error;
  });
  return connections.photographyMongoClient;
}
async function connect(client?: MongoClient, initialize = true) {
  client ??= await mongoClient();
  const db = client.db(process.env.MONGODB_DATABASE ?? 'photography');
  const repository = new MongoEnquiries(db.collection<Enquiry>('enquiries'));
  const authRepository = new MongoAuth(db);
  const pricing = new PricingService(db.collection<PricingRecord>('pricing'));
  const content = new ContentService(db.collection<ContentRecord>('content'));
  const callbacks = new CallbackService(
    db.collection<CallbackRequest>('callbacks'),
  );
  if (initialize)
    await Promise.all([
      repository.initialize(),
      authRepository.initialize(),
      content.initialize(),
      callbacks.initialize(),
    ]);
  return {
    publication: new ContentPublication(
      db.collection<PublicationRecord>('contentPublications'),
    ),
    quoteReads: new QuoteReads(db.collection<QuoteRead>('quoteReads')),
    drainTelegram: () => drainTelegram(db),
    repository,
    service: new EnquiryService(repository, () => pricing.get()),
    pricing,
    auth: new AuthService(authRepository),
    authRepository,
    content,
    callbacks,
  };
}
let services: ReturnType<typeof connect> | undefined;
export function database() {
  services ??= connect().catch((error) => {
    services = undefined;
    throw error;
  });
  return services;
}

// Production schema/index provisioning belongs to setup, never visitor requests.

// Workers cannot reuse sockets created by another request. Keep this connection
// alive only for the operation, including failures, and create it lazily so that
// rejected/unknown API requests never connect to MongoDB.
export async function withDatabase<T>(
  operation: (getDatabase: typeof database) => Promise<T>,
): Promise<T> {
  let isWorker = false;
  try {
    getCloudflareContext();
    isWorker = true;
  } catch {
    // The regular Next.js Node server retains its existing connection pool.
  }
  if (!isWorker) return operation(database);

  let client: MongoClient | undefined;
  let scopedServices: ReturnType<typeof connect> | undefined;
  const getDatabase = () => {
    scopedServices ??= (async () => {
      if (!process.env.MONGODB_URI)
        throw new Error('Database configuration is missing.');
      client = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 1,
      });
      await client.connect();
      const result = await connect(client, false);
      return result;
    })();
    return scopedServices;
  };
  try {
    return await operation(getDatabase);
  } finally {
    await client?.close();
  }
}
