import type { Db } from 'mongodb';
import { randomUUID } from 'node:crypto';
import type { Enquiry } from './enquiries';
import type { CallbackRequest } from '../features/contact/model';
import {
  alertText,
  sendTelegram,
  TelegramFailure,
  type TelegramAlert,
} from './telegram';

type Job = {
  _id: string;
  alert?: TelegramAlert;
  sent?: boolean;
  nextAttempt: Date;
  lease?: string;
  attempts: number;
};
type Marked = { telegramQueued?: boolean };

export async function drainTelegram(db: Db, deliver = sendTelegram) {
  const since = new Date(process.env.TELEGRAM_ALERTS_SINCE ?? '');
  if (
    !process.env.TELEGRAM_BOT_TOKEN ||
    !process.env.TELEGRAM_CHAT_ID ||
    Number.isNaN(since.getTime())
  )
    return;
  const jobs = db.collection<Job>('telegramNotifications');
  const callbacks = db.collection<CallbackRequest & Marked>('callbacks');
  const quotes = db.collection<Enquiry & Marked>('enquiries');
  async function enqueue(alert: TelegramAlert) {
    try {
      await jobs.updateOne(
        { _id: `${alert.kind}:${alert.id}` },
        {
          $setOnInsert: {
            alert,
            sent: false,
            attempts: 0,
            nextAttempt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
  // Reconcile persisted requests: a crash after saving cannot permanently lose an alert.
  for (const record of await callbacks
    .find({
      telegramQueued: { $ne: true },
      createdAt: { $gte: since.toISOString() },
    })
    .sort({ createdAt: 1 })
    .limit(50)
    .toArray()) {
    await enqueue({
      kind: 'callback',
      id: record._id,
      event: record.eventType,
      date: record.eventDate,
    });
    await callbacks.updateOne(
      { _id: record._id },
      { $set: { telegramQueued: true } },
    );
  }
  for (const record of await quotes
    .find({
      telegramQueued: { $ne: true },
      status: 'CONFIRMED',
      confirmedAt: { $gte: since },
    })
    .sort({ confirmedAt: 1 })
    .limit(50)
    .toArray()) {
    await enqueue({
      kind: 'quote',
      id: record._id,
      event: record.details.eventType,
      date: record.details.eventDate,
    });
    await quotes.updateOne(
      { _id: record._id },
      { $set: { telegramQueued: true } },
    );
  }
  // One dispatcher across instances; pace messages below Telegram's group limit.
  try {
    await jobs.updateOne(
      { _id: 'dispatcher' },
      { $setOnInsert: { nextAttempt: new Date(0), attempts: 0 } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const lease = randomUUID();
  const lock = await jobs.findOneAndUpdate(
    { _id: 'dispatcher', nextAttempt: { $lte: new Date() } },
    { $set: { lease, nextAttempt: new Date(Date.now() + 120000) } },
    { returnDocument: 'after' },
  );
  if (!lock) return;
  let cooldown = 3100;
  try {
    const pending = await jobs
      .find({ sent: false, nextAttempt: { $lte: new Date() } })
      .sort({ nextAttempt: 1 })
      .limit(3)
      .toArray();
    for (const [index, job] of pending.entries()) {
      if (index) await new Promise((resolve) => setTimeout(resolve, 3100));
      if (!job.alert) continue;
      try {
        await deliver(
          alertText(
            job.alert,
            process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
          ),
        );
        await jobs.updateOne(
          { _id: job._id },
          { $set: { sent: true }, $inc: { attempts: 1 } },
        );
      } catch (error) {
        cooldown = Math.max(
          error instanceof TelegramFailure ? error.retryAfter * 1000 : 60000,
          Math.min(3600000, 60000 * 2 ** Math.min(job.attempts, 6)),
        );
        await jobs.updateOne(
          { _id: job._id },
          {
            $set: { nextAttempt: new Date(Date.now() + cooldown) },
            $inc: { attempts: 1 },
          },
        );
        console.warn('Telegram alert queued for retry.');
        break;
      }
    }
  } finally {
    await jobs.updateOne(
      { _id: 'dispatcher', lease },
      {
        $set: { nextAttempt: new Date(Date.now() + cooldown) },
        $unset: { lease: '' },
      },
    );
  }
}
