import 'server-only';
import { MongoClient } from 'mongodb';
import { MongoAuth } from './mongo-auth';
import { MongoEnquiries } from './mongo-repository';
import { type Enquiry, EnquiryService } from './enquiries';
import { AuthService } from './auth';
import { ContentService } from './content';
import type { ContentRecord } from '../features/content/model';
import { CallbackService } from './callbacks';
import type { CallbackRequest } from '../features/contact/model';

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
async function connect() {
  const client = await mongoClient();
  const db = client.db(process.env.MONGODB_DATABASE ?? 'photography');
  const repository = new MongoEnquiries(db.collection<Enquiry>('enquiries'));
  const authRepository = new MongoAuth(db);
  const content = new ContentService(db.collection<ContentRecord>('content'));
  const callbacks = new CallbackService(
    db.collection<CallbackRequest>('callbacks'),
  );
  await Promise.all([
    repository.initialize(),
    authRepository.initialize(),
    content.initialize(),
    callbacks.initialize(),
  ]);
  return {
    repository,
    service: new EnquiryService(repository),
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
