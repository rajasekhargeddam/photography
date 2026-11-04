# Telegram operation in the unified app

Telegram delivery is automatically active in every app mode, including local development and previews, when TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID and a valid TELEGRAM_ALERTS_SINCE are configured. TELEGRAM_DISPATCH_ENABLED and TELEGRAM_LOCAL_DISPATCH_ENABLED are no longer used.

## Netlify

Deploy the updated management build (`npm run build`). In Netlify's Production environment, include Functions scope for TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_ALERTS_SINCE, TELEGRAM_RETRY_SECRET and NEXT_PUBLIC_SITE_URL. Set NEXT_PUBLIC_SITE_URL to the live HTTPS website origin so alert links open the hosted admin. Keep the existing activation cutoff; older requests are intentionally excluded. Redeploy after changing variables. Local and preview submissions can send real notifications when configured.

Successful callback and quote-confirmation requests trigger the queue via Next.js `after`. The existing Cloudflare scheduler targets the Cloudflare app, not Netlify. For independent retries on Netlify, configure a scheduler to POST to `/api/telegram/retry` with `Authorization: Bearer <TELEGRAM_RETRY_SECRET>`. Without a scheduler, retries depend on subsequent eligible submissions. Do not clear the queue or sent-job records.

## Messages and queue

Confirmed quotes and callbacks are eligible; drafts and records before TELEGRAM_ALERTS_SINCE are excluded. Messages contain saved customer/contact details, selected services, recorded amounts, album preferences and notes, with readable sections and India-time timestamps. Admin links use NEXT_PUBLIC_SITE_URL. Access tokens and secrets are never included.

Messages use plain text. The shared telegramNotifications collection persists numbered parts and nextPart progress. Each invocation sends at most three parts, spaced 3.1 seconds apart, under a shared lease. Failed delivery remains queued with backoff. A lost Telegram response/database acknowledgement can cause a duplicate part; delivery is at least once, not exactly once.

Keep queue contents private, preserve sent-job records and preserve the activation cutoff. Do not clear queues to troubleshoot delivery.

## Triggers and scheduler

Successful callback/confirmation requests trigger background delivery only for that request, without reconciling or sending older requests. Admin browsing does not trigger delivery. The retry endpoint and optional worker still reconcile and deliver eligible unsent requests, including older backlog. The existing my-dream-photography-lite-telegram Worker retries every 15 minutes using its APP binding. Backlogs and cooldowns can extend delays. The scheduler runs while your laptop is off.

Set bot token, chat ID, activation cutoff, site URL and retry secret in the lite app's existing secret store. Set the same retry secret in the scheduler's separate store. Retries require authorization and configured delivery settings.

Run `npm run telegram:scheduler:check` without deployment; upload scheduler versions through Cloudflare Builds with `npm run telegram:scheduler:upload`, then promote them in the dashboard. Configure the 15-minute Cron Trigger separately in Cloudflare. See [deployment setup](deployment.md).

## Local testing and advanced retry worker

Local web commands can send when configured. Also, records written to the live shared database can still be picked up by the hosted scheduler. Use an isolated database and test group for disposable test submissions.

The optional `npm run telegram:worker` requires the usual database/bot settings. It loads .env.local and must not run against the live shared database alongside the hosted sender. `-- --once` runs one batch. It is unnecessary for day-to-day content management.

Check bot membership/send permissions, chat selection, activation cutoff, matching retry secrets and scheduler errors when diagnosing delivery. Inspect counts/status without logging customer payloads. Routine tests use fake transports and send no real group messages.
