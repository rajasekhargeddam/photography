import { MongoClient } from 'mongodb';
import { drainTelegram } from '../src/server/telegram-queue';

async function main() {
  if (
    !process.env.MONGODB_URI ||
    !process.env.TELEGRAM_BOT_TOKEN ||
    !process.env.TELEGRAM_CHAT_ID ||
    !process.env.TELEGRAM_ALERTS_SINCE
  )
    throw new Error(
      'Configure MongoDB and Telegram server environment variables first.',
    );
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE ?? 'photography');
    console.log('Telegram retry worker started. Press Ctrl+C to stop.');
    do {
      try {
        await drainTelegram(db);
      } catch {
        console.warn(
          'Telegram retry worker will retry; connection unavailable.',
        );
      }
      if (process.argv.includes('--once')) break;
      await new Promise((resolve) => setTimeout(resolve, 15000));
    } while (true);
  } finally {
    await client.close();
  }
}
void main().catch(() => {
  console.error(
    'Telegram worker could not start. Check server configuration and connectivity.',
  );
  process.exitCode = 1;
});
