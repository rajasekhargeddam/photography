# Telegram operation

The lite app is the active sender. The original retains the same formatting/queue code but returns before dispatch unless TELEGRAM_LOCAL_DISPATCH_ENABLED=true. Keep that flag unset/false while lite operates. The old hosted sender's token was removed during cutover; do not re-enable a second sender.

## Messages and queue

Confirmed quotes and callback requests are eligible; draft quotes and records before TELEGRAM_ALERTS_SINCE are excluded. Messages include saved customer name/phone, event details, selected services, recorded prices, album preferences and notes where available. Readable sections, India-time timestamps and production admin links help the studio follow up. Never put access tokens or credentials in notifications.

Messages use plain text. Parts are persisted before sending and nextPart advances after each successful part. Each run sends at most three parts, spaced 3.1 seconds apart, under a shared MongoDB lease. Failed delivery stays queued with backoff. A lost Telegram response/database acknowledgement can cause a duplicate part; delivery is at least once, not exactly once.

The shared telegramNotifications collection contains personal information. Keep its access private; do not dump queue payloads into logs or public endpoints. Preserve the existing activation timestamp and sent-job records during deployments.

## Triggers and retries

Successful callback/quote-confirmation submissions trigger background delivery. Admin browsing does not. The deployed lite scheduler runs every five minutes through an APP service binding; quiet periods still incur scheduler/service/database work. Backlogs and cooldowns can delay delivery beyond five minutes.

Configure TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_ALERTS_SINCE and NEXT_PUBLIC_SITE_URL on the lite app. Its TELEGRAM_RETRY_SECRET must match the scheduler's secret. The protected POST /api/telegram/retry rejects missing/wrong authorization; missing delivery configuration returns 503. See [deployment setup](deployment.md).

npm run telegram:worker is an optional local loop; -- --once processes one batch. Use only an isolated development destination, or an intentional sender cutover. It is not needed on the laptop for hosted delivery. The original's default guard also applies to this local command.

## Troubleshooting

Check bot membership/send permission, the selected chat, configured activation cutoff, matching retry secrets and scheduler errors. Inspect queue status/counts without exposing customer details. Preserve pending jobs and successful part progress; do not clear the queue to fix delivery. Confirm saved source requests exist if legacy pending summaries cannot be hydrated.

The user previously confirmed the enquiry/admin/Telegram flow works. That confirmation does not replace checking the scheduler after a new release. Routine tests use fake transports and do not send messages to the group.
