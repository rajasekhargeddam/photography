import type { Db } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { telegramEnabled } from './telegram-policy';
import type { Enquiry } from './enquiries';
import type { CallbackRequest } from '../features/contact/model';
import {
  alertMessages,
  callbackAlert,
  quoteAlert,
  sendTelegram,
  TelegramFailure,
  type TelegramAlert,
} from './telegram';

type Job = {
  _id: string;
  alert?: TelegramAlert;
  sent?: boolean;
  messages?: string[];
  nextPart?: number;
  nextAttempt: Date;
  lease?: string;
  attempts: number;
};
type Marked = { telegramQueued?: boolean };
export type TelegramTarget = Pick<TelegramAlert, 'kind' | 'id'>;

export async function drainTelegram(
  db: Db,
  deliver = sendTelegram,
  pause = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  target?: TelegramTarget,
) {
  // Delivery is active in every mode when the bot settings are configured.
  if (deliver === sendTelegram && !telegramEnabled()) return;
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
      ...(target ? { _id: target.kind === 'callback' ? target.id : '' } : {}),
      telegramQueued: { $ne: true },
      createdAt: { $gte: since.toISOString() },
    })
    .sort({ createdAt: 1 })
    .limit(50)
    .toArray()) {
    await enqueue(callbackAlert(record));
    await callbacks.updateOne(
      { _id: record._id },
      { $set: { telegramQueued: true } },
    );
  }
  for (const record of await quotes
    .find({
      ...(target ? { _id: target.kind === 'quote' ? target.id : '' } : {}),
      telegramQueued: { $ne: true },
      status: 'CONFIRMED',
      confirmedAt: { $gte: since },
    })
    .sort({ confirmedAt: 1 })
    .limit(50)
    .toArray()) {
    await enqueue(quoteAlert(record));
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
      .find({
        ...(target ? { _id: `${target.kind}:${target.id}` } : {}),
        sent: false,
        nextAttempt: { $lte: new Date() },
      })
      .sort({ nextAttempt: 1 })
      .limit(3)
      .toArray();
    let delivered = 0;
    for (const job of pending) {
      if (delivered >= 3) break;
      if (!job.alert) continue;
      try {
        if (!job.messages) {
          // Upgrade previously queued summaries using the saved source record.
          if (!job.alert.detailLines) {
            const source =
              job.alert.kind === 'quote'
                ? await quotes.findOne({ _id: job.alert.id })
                : await callbacks.findOne({ _id: job.alert.id });
            if (!source) throw new Error('Saved request unavailable');
            job.alert =
              job.alert.kind === 'quote'
                ? quoteAlert(source as Enquiry)
                : callbackAlert(source as CallbackRequest);
          }
          job.messages = alertMessages(
            job.alert,
            process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
          );
          await jobs.updateOne(
            { _id: job._id },
            { $set: { messages: job.messages, nextPart: 0 } },
          );
        }
        let part = job.nextPart ?? 0;
        while (part < job.messages.length && delivered < 3) {
          if (delivered) await pause(3100);
          // A suspended worker may resume after another instance took over.
          // Renew only an unexpired lease before sending any further parts.
          const owned = await jobs.findOneAndUpdate(
            {
              _id: 'dispatcher',
              lease,
              nextAttempt: { $gte: new Date() },
            },
            { $set: { nextAttempt: new Date(Date.now() + 120000) } },
            { returnDocument: 'after' },
          );
          if (!owned) return;
          await deliver(job.messages[part]);
          delivered++;
          part++;
          await jobs.updateOne(
            { _id: job._id },
            {
              $set: { nextPart: part, sent: part === job.messages.length },
              $inc: { attempts: 1 },
            },
          );
        }
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
