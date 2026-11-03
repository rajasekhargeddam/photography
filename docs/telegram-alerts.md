# Telegram operation in the unified app

Only the **deployed lite mode** sends notifications in normal operation. It requires compiled APP_VARIANT=lite and runtime TELEGRAM_DISPATCH_ENABLED=true. The flag is configured in wrangler.jsonc. Management mode never sends; local dev/start commands and Cloudflare preview force delivery off. The retired TELEGRAM_LOCAL_DISPATCH_ENABLED setting no longer controls delivery.

## Messages and queue

Confirmed quotes and callbacks are eligible; drafts and records before TELEGRAM_ALERTS_SINCE are excluded. Messages contain saved customer/contact details, selected services, recorded amounts, album preferences and notes, with readable sections and India-time timestamps. Admin links use NEXT_PUBLIC_SITE_URL. Access tokens and secrets are never included.

Messages use plain text. The shared telegramNotifications collection persists numbered parts and nextPart progress. Each invocation sends at most three parts, spaced 3.1 seconds apart, under a shared lease. Failed delivery remains queued with backoff. A lost Telegram response/database acknowledgement can cause a duplicate part; delivery is at least once, not exactly once.

Keep queue contents private, preserve sent-job records and preserve the activation cutoff. Do not clear queues to troubleshoot delivery.

## Triggers and scheduler

Successful lite callback/confirmation requests trigger background delivery. Admin browsing does not. The existing my-dream-photography-lite-telegram Worker retries every 15 minutes using its APP binding. Backlogs and cooldowns can extend delays. The scheduler runs while your laptop is off.

Set bot token, chat ID, activation cutoff, site URL and retry secret in the lite app's existing secret store. Set the same retry secret in the scheduler's separate store. Disabled delivery returns 503 from the retry endpoint before database work. When enabled, authorization is required and missing delivery settings fail rather than silently reporting success.

Run `npm run telegram:scheduler:check` without deployment; upload scheduler versions through Cloudflare Builds with `npm run telegram:scheduler:upload`, then promote them in the dashboard. Configure the 15-minute Cron Trigger separately in Cloudflare. See [deployment setup](deployment.md).

## Local testing and advanced retry worker

Local web commands never send. However, records written to the live shared database can still be picked up by the hosted scheduler. Use an isolated database and test group for disposable test submissions.

The optional `npm run telegram:worker` requires explicit APP_VARIANT=lite and TELEGRAM_DISPATCH_ENABLED=true in its environment, plus the usual database/bot settings. It loads .env.local and must not run against the live shared database alongside the hosted sender. `-- --once` runs one batch. It is unnecessary for day-to-day content management.

Check bot membership/send permissions, chat selection, activation cutoff, matching retry secrets and scheduler errors when diagnosing delivery. Inspect counts/status without logging customer payloads. Routine tests use fake transports and send no real group messages.
