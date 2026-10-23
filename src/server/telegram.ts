export type TelegramAlert = {
  kind: 'callback' | 'quote';
  id: string;
  event: string;
  date: string;
};

export function alertText(alert: TelegramAlert, origin: string) {
  const url = new URL(origin);
  const path =
    alert.kind === 'quote'
      ? `/admin/requests/${encodeURIComponent(alert.id)}`
      : '/admin/requests';
  const publicLink =
    url.protocol === 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  return [
    alert.kind === 'quote' ? '📸 New quote request' : '📞 New call request',
    'My Dream Photography',
    `Event: ${alert.event.replace(/[\r\n]/g, ' ').slice(0, 100)}`,
    `Date: ${alert.date || 'Not decided'}`,
    `Request: ${alert.id}`,
    publicLink
      ? `View request: ${new URL(path, url).href}`
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
