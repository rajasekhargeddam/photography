# Telegram enquiry alerts

Server-only configuration: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ALERTS_SINCE` (ISO UTC activation time), and `TELEGRAM_RETRY_SECRET`. Never commit tokens or prefix them with NEXT_PUBLIC_. Copy these settings to the hosting provider at deployment. Keep the original activation time when redeploying.

New call requests and confirmed/submitted quotes trigger delivery using Next.js `after`, after the response is sent. Draft quotes and records older than the activation time are excluded. Messages contain event, date, reference and an admin link, without phone numbers or private notes. Localhost links are omitted; set NEXT_PUBLIC_SITE_URL to the actual HTTPS domain at launch.

The dispatcher reconciles saved MongoDB requests into the `telegramNotifications` collection. It marks source records only after enqueueing, uses stable per-request IDs, and serializes delivery across instances. Telegram errors remain queued with backoff, including Telegram's retry_after. Each run processes at most three messages, spaced 3.1 seconds apart.

## Reliable retries when nobody visits the site

For local development or a persistent Node server, run `npm run telegram:worker` alongside the website. It checks every 15 seconds. `npm run telegram:worker -- --once` processes one batch and exits.

For serverless hosting, configure a scheduler to POST `/api/telegram/retry` every minute with `Authorization: Bearer <TELEGRAM_RETRY_SECRET>`. Do not place the secret in the URL. The endpoint fails closed when no secret is configured. Scheduling is hosting-specific and is not automatically deployed by this repository. Successful admin API visits and request submissions also trigger the dispatcher, but are not a substitute for scheduled retries during quiet periods.

Normal repeated submissions and concurrent workers do not repeat successful alerts. Telegram has no sendMessage idempotency key: if Telegram accepts a message but its response or the subsequent database update is lost, a retry can duplicate the message. This rare at-least-once delivery tradeoff avoids silently dropping alerts. Reference IDs help identify duplicates.

No webhook or inbound bot-message polling is needed for alerts. Enable Telegram phone notifications and leave the group unmuted. The website must be running/deployed; phone delivery timing is subject to Telegram, internet access and device settings.
