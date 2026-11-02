# Deploying lite from the unified repository

The supported hosted target is **my-dream-photography-lite** at https://my-dream-photography-lite.ganeshrajasekhar219.workers.dev. Full management runs locally. `wrangler.jsonc` now points to lite; the older full-app Worker is not changed by these commands.

## Before deployment

1. Run `npm ci` with Node.js 22 or newer.
2. Preserve existing `.env.local`; it supplies the local/shared database and public WhatsApp setting. No sibling project is required.
3. Stop local app/build/preview processes. Commands share build output and enforce a lock.
4. Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`.
5. Authenticate with `npm run cf:login` if required.

For a new database only, run management locally and request `/api/health` to initialize indexes and labelled samples, then seed an admin interactively. Cloudflare request handlers skip setup. The existing production database is already provisioned; do not create disposable records there for testing.

## Build and deploy

`npm run build:lite` builds without deploying. `npm run check:bundle` checks the resulting Worker using Wrangler dry-run. `npm run deploy:lite` always builds fresh, verifies the variant/build ID, and uploads. It cannot upload a management-mode build through this command. Wrangler's custom pre-upload check also rejects bundles whose saved Next config is not lite.

The build embeds APP_VARIANT=lite in server and browser code. Changing a runtime variable cannot enable management APIs in that build. A build stamp records variant, Next build ID, canonical origin and Cloudflare packaging. Starting development invalidates that stamp; rebuild before start/preview/deploy.

The default production canonical origin is the current lite workers.dev URL. For a custom domain, set `LITE_SITE_URL=https://your-domain.example` in the terminal or ignored `.env.local` (no trailing slash). Set runtime `APP_ORIGIN` and `NEXT_PUBLIC_SITE_URL` to the same HTTPS origin in Cloudflare, then rebuild/deploy and verify canonical URLs. Do not use a local origin for production. The launcher preserves the public WhatsApp setting while selecting the proper origin.

## Runtime configuration

Existing secrets remain attached to the same Worker name. They are not automatically uploaded from `.env.local`.

| Value                                                       | Location / purpose                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| MONGODB_URI, MONGODB_DATABASE                               | Lite Worker secrets: existing shared database                              |
| APP_ORIGIN, NEXT_PUBLIC_SITE_URL                            | Lite runtime: exact public HTTPS origin                                    |
| NEXT_PUBLIC_WHATSAPP_NUMBER                                 | Build environment: optional public button number                           |
| CONTENT_PUBLISH_SECRET                                      | Lite secret: optional protected publishing endpoint                        |
| TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_ALERTS_SINCE | Lite secrets: destination and existing activation cutoff                   |
| TELEGRAM_RETRY_SECRET                                       | Matching secret in app and scheduler stores                                |
| TELEGRAM_DISPATCH_ENABLED                                   | Non-secret `true` in deployed wrangler.jsonc; local commands force `false` |
| CLOUDINARY_URL                                              | Local management only; not needed for lite public image reads              |

Use `npx wrangler secret put NAME` interactively to set an app secret. Scheduler secrets require `--config wrangler.telegram.jsonc`. Do not rotate existing values or replace them with example placeholders during ordinary redeployments. APP_VARIANT is build-time, not a secret or runtime toggle.

## Cloudflare preview

Build lite, then run `npm run preview:lite`. The command uses local Wrangler preview and forces Telegram off. Use ignored `.dev.vars` for an isolated preview database and `APP_ORIGIN=http://localhost:8787` (or the preview address shown). Never point disposable test submissions at the live shared database: the hosted scheduler can still discover them, even if preview sending is off. `npm run start:lite` is a Node preview on port 3001, not a Cloudflare runtime test.

OpenNext warns about Windows support. Windows Developer Mode may be needed for symlinks, or build in WSL. Do not count interrupted or sandbox-stalled builds as successful verification.

## Scheduler

The existing scheduler remains **my-dream-photography-lite-telegram**, with a five-minute cron and APP binding to lite. Run `npm run telegram:scheduler:check` for a dry-run, then `npm run telegram:scheduler:deploy` only when its code/configuration changes. A normal app deployment does not require redeploying the scheduler. Preserve both copies of TELEGRAM_RETRY_SECRET.

## After deployment and rollback

Verify public pages/assets, repeated public cache hits, login/logout, 404 responses for management pages/APIs, 401 for anonymous request APIs, and intended request/Telegram delivery. Use actual intended requests or an explicitly authorized isolated test; do not send unsolicited group tests.

Review Worker CPU/errors and scheduled execution. Previous lite samples measured 1–2 ms CPU for cache hits and 58–665 ms for misses. Login hashing and cold reads remain risks; free-tier suitability is not established by successful builds. No paid upgrade is introduced here.

Keep the previous Cloudflare version for code rollback. Do not delete or roll back customer records. The old sibling folder is retained as a reference, but normal maintenance and deployment now happen in this repository. No live deployment is performed merely by converting the source.
