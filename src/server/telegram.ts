import type { Enquiry } from './enquiries';
import type { CallbackRequest } from '../features/contact/model';
import { ceremonyName } from '../features/booking/quote';
export type TelegramAlert = {
  kind: 'callback' | 'quote';
  id: string;
  event: string;
  date: string;
  detailLines?: string[];
};

export function alertText(alert: TelegramAlert, origin: string) {
  const url = new URL(origin);
  const path =
    alert.kind === 'quote'
      ? `/admin/requests/${encodeURIComponent(alert.id)}`
      : '/admin/callbacks';
  const publicLink =
    url.protocol === 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  return [
    alert.kind === 'quote' ? '📸 New quote request' : '📞 New call request',
    'My Dream Photography',
    '━━━━━━━━━━━━━━━━━━',
    '',
    `📅 Event: ${alert.event.replace(/[\r\n]/g, ' ').slice(0, 100)}`,
    `Date: ${prettyDate(alert.date)}`,
    ...(alert.detailLines ?? []),
    '',
    '━━━━━━━━━━━━━━━━━━',
    `🔖 Request: ${alert.id}`,
    publicLink
      ? `🔗 View request: ${new URL(path, url).href}`
      : 'Open the local admin portal to view this request.',
  ].join('\n');
}

export class TelegramFailure extends Error {
  constructor(public retryAfter = 60) {
    super('Telegram delivery unavailable');
  }
}

export async function sendTelegram(
  text: string,
  request: typeof fetch = fetch,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new TelegramFailure();
  try {
    const response = await request(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const result = await response.json();
    if (!response.ok || result.ok !== true)
      throw new TelegramFailure(
        Math.max(60, Number(result.parameters?.retry_after) || 60),
      );
  } catch (error) {
    // Never propagate fetch errors containing the secret token in the URL.
    throw error instanceof TelegramFailure ? error : new TelegramFailure();
  }
}

const value = (text: string | undefined) => text?.trim() || 'Not provided';
const amount = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const prettyDate = (date: string) =>
  !date
    ? 'Not decided'
    : /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))
      ? new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Kolkata',
        }).format(new Date(date + 'T12:00:00+05:30'))
      : date;
const received = (date: string | Date) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date)) + ' IST';
export function callbackAlert(record: CallbackRequest): TelegramAlert {
  return {
    kind: 'callback',
    id: record._id,
    event: record.eventType,
    date: record.eventDate,
    detailLines: [
      '',
      '👤 CUSTOMER',
      'Name: ' + value(record.name),
      'Phone: ' + value(record.mobile),
      '',
      '📝 CUSTOMER NOTES',
      value(record.notes),
      '',
      'Received: ' + received(record.createdAt),
    ],
  };
}
export function quoteAlert(record: Enquiry): TelegramAlert {
  const d = record.details;
  const items = d.items ?? [];
  const used = new Set<number>();
  const line = (item: (typeof items)[number]) =>
    '• ' +
    item.name +
    ' — ' +
    item.quantity +
    (item.unit ? ' ' + item.unit : '') +
    '\n  ' +
    amount(item.price) +
    ' each · ' +
    amount(item.quantity * item.price);
  const ceremonies = (d.ceremonies ?? []).flatMap((c) => {
    const label = ceremonyName(d.eventType, c.id);
    const services = items.flatMap((item, index) => {
      if (item.groupId !== c.id && item.groupName !== label) return [];
      used.add(index);
      return [line(item)];
    });
    return [
      '',
      '📍 ' + label.toUpperCase(),
      'Date: ' + (c.dateUndecided ? 'Not decided' : prettyDate(c.date)),
      'Location: ' + value(c.location),
      'Days: ' + c.days,
      ...services,
    ];
  });
  const other = items.flatMap((item, index) =>
    used.has(index) ? [] : [line(item)],
  );
  return {
    kind: 'quote',
    id: record._id,
    event: d.eventType === 'Marriage' ? 'Wedding' : d.eventType,
    date: d.eventDate,
    detailLines: [
      '',
      '👤 CUSTOMER',
      'Name: ' + value(d.name),
      'Phone: ' + value(d.mobile),
      ...(!d.ceremonies?.length ? ['Location: ' + value(d.location)] : []),
      ...(d.packageId ? ['Package: ' + d.packageId] : []),
      ...ceremonies,
      ...(other.length ? ['', '🎥 SERVICES & EXTRAS', ...other] : []),
      ...(d.albumQuantity !== undefined
        ? [
            '',
            '📖 ALBUMS',
            'Albums: ' + d.albumQuantity,
            ...(d.albumQuantity > 0
              ? [
                  'Size: ' + value(d.albumSize),
                  'Delivery: ' +
                    {
                      discuss: 'Discuss with studio',
                      'one-month': 'One month',
                      'three-month': 'Three months',
                    }[d.albumDelivery ?? 'discuss'],
                ]
              : []),
          ]
        : []),
      ...(typeof d.total === 'number'
        ? [
            '',
            '💰 SAVED ESTIMATE',
            amount(d.total),
            'Final pricing to be confirmed with the studio.',
          ]
        : []),
      '',
      '📝 CUSTOMER NOTES',
      value(d.notes),
      '',
      'Submitted: ' +
        (record.confirmedAt ? received(record.confirmedAt) : 'Not recorded'),
    ],
  };
}
/** Split without losing text or breaking UTF-16 surrogate pairs. Leave room for part labels. */
export function alertMessages(alert: TelegramAlert, origin: string) {
  const text = alertText(alert, origin);
  if (text.length <= 4096) return [text];
  const chunks: string[] = [];
  let chunk = '';
  for (const character of text) {
    if (chunk.length + character.length > 3500) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += character;
  }
  if (chunk) chunks.push(chunk);
  return chunks.map(
    (body, index) =>
      'Request ' +
      alert.id.slice(0, 100) +
      ' — part ' +
      (index + 1) +
      '/' +
      chunks.length +
      '\n' +
      body,
  );
}
