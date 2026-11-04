export function telegramEnabled() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    !Number.isNaN(Date.parse(process.env.TELEGRAM_ALERTS_SINCE ?? '')),
  );
}
