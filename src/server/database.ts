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

async function connect() {
  if (!process.env.MONGODB_URI)
    throw new Error('Database configuration is missing.');
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });
  try {
    await client.connect();
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
  } catch (error) {
    await client.close();
    throw error;
  }
}
const connections = globalThis as typeof globalThis & {
  photographyConnection?: ReturnType<typeof connect>;
};
export function database() {
  connections.photographyConnection ??= connect().catch((error) => {
    connections.photographyConnection = undefined;
    throw error;
  });
  return connections.photographyConnection;
}
