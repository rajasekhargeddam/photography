import { MongoClient } from 'mongodb';
import {
  ContentPublication,
  type PublicationRecord,
} from '../src/server/content-publication';

async function main() {
  if (!process.env.MONGODB_URI)
    throw new Error('Configure MONGODB_URI in .env.local.');
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE ?? 'photography');
    const revision = await new ContentPublication(
      db.collection<PublicationRecord>('contentPublications'),
    ).publish();
    console.log(
      `Published content revision ${revision}. Allow about 60 seconds, then reload the deployed website.`,
    );
  } finally {
    await client.close();
  }
}
main().catch(() => {
  console.error(
    'Publishing failed. Check the shared MongoDB configuration and connectivity.',
  );
  process.exitCode = 1;
});
